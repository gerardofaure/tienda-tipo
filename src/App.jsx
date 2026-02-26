import React, { useEffect, useMemo, useState } from "react";
import logoBodeguita from "./assets/logo-bodeguita-mily.png";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import {
  subscribeProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./firebase/products";
import { loginAdmin, logoutAdmin } from "./firebase/auth";

const WHATSAPP_NUMBER = "56987231623";

const CATEGORIES = [
  "TODOS",
  "HUEVOS",
  "DESPENSA",
  "ENCURTIDOS",
  "DULCES Y SALADOS",
  "PRODUCTOS DEL MAR",
  "CONGELADOS",
  "ASEO",
  "AUTOMOTRIZ",
];

function normalizeText(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Ahora promos se guardan como TOTAL por pack:
 * promos: { "2": 12000, "3": 17000, "4": 22000 }
 * Eso significa:
 * - Si qty>=2 y existe promo["2"], el total para las 2 unidades es 12000.
 * - Si qty>=3 y existe promo["3"], el total para las 3 unidades es 17000.
 * - Si qty>=4 y existe promo["4"], el total para las 4 unidades es 22000.
 *
 * Para calcular el precio unitario "efectivo" que usamos en carrito:
 * - tomamos el mejor pack aplicable según qty (4, luego 3, luego 2)
 * - unit = promoTotal / packSize
 */
function getEffectiveUnitPrice(product, qty) {
  const base = Number(product?.price ?? 0);
  const promos = product?.promos || {};
  const t2 = promos["2"] != null ? Number(promos["2"]) : null;
  const t3 = promos["3"] != null ? Number(promos["3"]) : null;
  const t4 = promos["4"] != null ? Number(promos["4"]) : null;

  if (qty >= 4 && t4 != null && !Number.isNaN(t4) && t4 > 0) return t4 / 4;
  if (qty >= 3 && t3 != null && !Number.isNaN(t3) && t3 > 0) return t3 / 3;
  if (qty >= 2 && t2 != null && !Number.isNaN(t2) && t2 > 0) return t2 / 2;
  return base;
}

function promoSummary(product) {
  const promos = product?.promos || {};
  const parts = [];
  if (promos["2"]) parts.push(`2 x ${formatCLP(promos["2"])}`);
  if (promos["3"]) parts.push(`3 x ${formatCLP(promos["3"])}`);
  if (promos["4"]) parts.push(`4 x ${formatCLP(promos["4"])}`);
  return parts.join(" • ");
}

/* ---------- Modal genérico ---------- */
function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- UI parts ---------- */
function CategorySidebar({ activeCategory, onSelect }) {
  return (
    <aside className="category-sidebar">
      <div className="card category-card">
        <div className="category-title">Categorías</div>
        <div className="category-list">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`category-item ${activeCategory === c ? "active" : ""}`}
              onClick={() => onSelect(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ProductCard({ product, quantityInCart, onIncrement, onDecrement }) {
  const isOutOfStock = product.inStock === false;
  const qty = quantityInCart || 0;
  const unit = getEffectiveUnitPrice(product, qty > 0 ? qty : 1);
  const promoText = promoSummary(product);

  return (
    <div className="card product-card">
      <div className="product-top">
        <span className="category-tag">{product.category}</span>
        {isOutOfStock ? (
          <span className="stock-badge no-stock">SIN STOCK</span>
        ) : null}
      </div>

      <div className="product-image-wrap">
        <img
          className="product-image"
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/600x400?text=Sin+Imagen";
          }}
        />
      </div>

      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>

      {promoText ? <div className="promo-badge">Promo: {promoText}</div> : null}

      <div className="product-bottom">
        <div className="price-block">
          <div className="price">{formatCLP(unit)}</div>
          {promoText ? (
            <div className="muted small">Precio unitario según cantidad</div>
          ) : null}
        </div>

        <div className="qty-controls">
          <button
            onClick={() => onDecrement(product)}
            disabled={isOutOfStock || qty <= 0}
            title={qty <= 0 ? "Aún no está en el carrito" : "Quitar 1"}
          >
            −
          </button>

          <span className={`qty-number ${qty > 0 ? "qty-number-active" : ""}`}>
            {qty}
          </span>

          <button
            onClick={() => onIncrement(product)}
            disabled={isOutOfStock}
            title={isOutOfStock ? "Producto sin stock" : "Agregar 1"}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function CartContent({
  items,
  products,
  onChangeQty,
  onRemove,
  onClear,
  onCheckout,
  customerName,
  customerAddress,
  deliveryReference,
  paymentMethod,
  onCustomerNameChange,
  onCustomerAddressChange,
  onDeliveryReferenceChange,
  onPaymentMethodChange,
}) {
  const detailedItems = useMemo(() => {
    return items
      .map((it) => {
        const product = products.find((p) => p.id === it.productId);
        if (!product) return null;
        return { ...it, product };
      })
      .filter(Boolean);
  }, [items, products]);

  const total = useMemo(() => {
    return detailedItems.reduce((sum, item) => {
      const unit = getEffectiveUnitPrice(item.product, item.quantity);
      return sum + unit * item.quantity;
    }, 0);
  }, [detailedItems]);

  const countItems = detailedItems.reduce((sum, it) => sum + it.quantity, 0);
  const hasItems = detailedItems.length > 0;

  return (
    <div className="cart-modal-content">
      <div className="cart-summary-row">
        <span className="badge">{countItems} ítems</span>
        <button
          className="btn btn-outline btn-small"
          onClick={onClear}
          disabled={!hasItems}
        >
          Vaciar
        </button>
      </div>

      {!hasItems ? (
        <div className="muted">Tu carro está vacío.</div>
      ) : (
        <div className="cart-items">
          {detailedItems.map((item) => {
            const unit = getEffectiveUnitPrice(item.product, item.quantity);
            const base = Number(item.product.price ?? 0);
            const isPromo = unit !== base;

            return (
              <div key={item.productId} className="cart-item">
                <div>
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="muted small">
                    Unit: {formatCLP(unit)}
                    {isPromo ? (
                      <span className="promo-inline"> (promo)</span>
                    ) : null}
                  </div>
                </div>

                <div className="qty-controls">
                  <button
                    onClick={() =>
                      onChangeQty(item.productId, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span className="qty-number qty-number-active">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onChangeQty(item.productId, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  <div className="cart-subtotal">
                    {formatCLP(unit * item.quantity)}
                  </div>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => onRemove(item.productId)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="cart-footer">
        <div className="form-row">
          <label>Nombre</label>
          <input
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="form-row">
          <label>Medio de pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
          >
            <option value="Efectivo contra entrega">Efectivo contra entrega</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>

        <div className="form-row">
          <label>Dirección</label>
          <input
            value={customerAddress}
            onChange={(e) => onCustomerAddressChange(e.target.value)}
            placeholder="Dirección"
          />
        </div>

        <div className="form-row">
          <label>Referencia</label>
          <input
            value={deliveryReference}
            onChange={(e) => onDeliveryReferenceChange(e.target.value)}
            placeholder="Ej: portón negro, casa esquina..."
          />
        </div>

        <div className="cart-total-row">
          <strong>Total</strong>
          <strong>{formatCLP(total)}</strong>
        </div>

        <button
          className="btn btn-success"
          onClick={() => onCheckout(total)}
          disabled={!hasItems}
        >
          Enviar a WhatsApp
        </button>
      </div>

      <div className="card info-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Despacho</h3>
        <div className="muted small">
          Se enviará tu pedido a WhatsApp con el detalle y total.
        </div>
      </div>
    </div>
  );
}

function AdminContent({
  adminUser,
  isAdmin,
  products,
  onLogin,
  onLogout,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authError, setAuthError] = useState("");

  const [mode, setMode] = useState("create"); // create | edit
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "DESPENSA",
    image: "",
    inStock: true,
    promo2: "",
    promo3: "",
    promo4: "",
  });

  useEffect(() => {
    if (mode === "create") {
      setSelectedId("");
      setForm({
        name: "",
        description: "",
        price: "",
        category: "DESPENSA",
        image: "",
        inStock: true,
        promo2: "",
        promo3: "",
        promo4: "",
      });
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const p = products.find((x) => x.id === selectedId);
    if (!p) return;

    setForm({
      name: p.name || "",
      description: p.description || "",
      price: String(p.price ?? ""),
      category: p.category || "DESPENSA",
      image: p.image || "",
      inStock: p.inStock !== false,
      promo2: p.promos?.["2"] ? String(p.promos["2"]) : "",
      promo3: p.promos?.["3"] ? String(p.promos["3"]) : "",
      promo4: p.promos?.["4"] ? String(p.promos["4"]) : "",
    });
  }, [mode, selectedId, products]);

  const categoriesWithoutTodos = CATEGORIES.filter((c) => c !== "TODOS");

  const toNumberOrNull = (v) => {
    const n = Number(v);
    if (!v) return null;
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
  };

  const buildPayload = () => {
    const price = Number(form.price);

    // promos ahora son TOTALES por pack
    const promos = {
      "2": toNumberOrNull(form.promo2),
      "3": toNumberOrNull(form.promo3),
      "4": toNumberOrNull(form.promo4),
    };

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      category: form.category,
      image: form.image.trim(),
      inStock: Boolean(form.inStock),
      promos,
    };
  };

  const validatePayload = (payload) => {
    if (!payload.name || !payload.description || !payload.image)
      return "Completa nombre, descripción e imagen.";
    if (Number.isNaN(payload.price) || payload.price < 0)
      return "Ingresa un precio válido.";
    return "";
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      await onLogin(email.trim(), pass);
      setEmail("");
      setPass("");
    } catch (err) {
      console.error(err);
      setAuthError("No se pudo iniciar sesión. Revisa email/clave.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    const error = validatePayload(payload);
    if (error) {
      alert(error);
      return;
    }

    try {
      if (mode === "create") {
        await onCreate(payload);
        alert("Producto agregado.");
        setForm((f) => ({
          ...f,
          name: "",
          description: "",
          price: "",
          image: "",
          promo2: "",
          promo3: "",
          promo4: "",
        }));
        return;
      }

      if (!selectedId) {
        alert("Selecciona un producto para editar.");
        return;
      }

      await onUpdate(selectedId, payload);
      alert("Producto actualizado.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error guardando cambios.");
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      alert("Selecciona un producto para eliminar.");
      return;
    }
    const p = products.find((x) => x.id === selectedId);
    const ok = window.confirm(`¿Eliminar "${p?.name || "producto"}"?`);
    if (!ok) return;

    try {
      await onDelete(selectedId);
      alert("Producto eliminado.");
      setSelectedId("");
      setMode("create");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error eliminando.");
    }
  };

  if (!adminUser) {
    return (
      <div className="admin-login">
        <form onSubmit={handleAuthSubmit}>
          <div className="form-row">
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tu-dominio.cl"
            />
          </div>
          <div className="form-row">
            <label>Clave</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {authError ? <div className="error">{authError}</div> : null}
          <button className="btn" type="submit">
            Ingresar
          </button>
          <div className="muted small" style={{ marginTop: 8 }}>
            * Debe ser un usuario autorizado.
          </div>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="error">Este usuario no tiene permisos de Admin.</div>
        <button
          className="btn btn-outline"
          style={{ marginTop: 10 }}
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="admin-panel-modal">
      <div className="admin-head-row">
        <div className="muted small">
          Sesión: <strong>{adminUser.email}</strong>
        </div>
        <button className="btn btn-outline btn-small" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`chip ${mode === "create" ? "active" : ""}`}
          onClick={() => setMode("create")}
          type="button"
        >
          Agregar nuevo
        </button>
        <button
          className={`chip ${mode === "edit" ? "active" : ""}`}
          onClick={() => setMode("edit")}
          type="button"
        >
          Editar / Eliminar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        {mode === "edit" ? (
          <div className="form-row">
            <label>Producto existente</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Selecciona un producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.category}{" "}
                  {p.inStock === false ? "(Sin stock)" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="form-row">
          <label>Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="form-row">
          <label>Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        <div className="field-grid">
          <div className="form-row">
            <label>Precio base (CLP)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <label>Categoría</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {categoriesWithoutTodos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label>URL de imagen</label>
          <input
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          />
        </div>

        <div className="form-row checkbox-row">
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) =>
                setForm((f) => ({ ...f, inStock: e.target.checked }))
              }
            />
            <span>Disponible en stock</span>
          </label>
        </div>

        <div className="promo-box">
          <div className="promo-title">Promociones (TOTAL por pack)</div>
          <div className="promo-grid">
            <div className="form-row">
              <label>2 x (total)</label>
              <input
                type="number"
                min="0"
                value={form.promo2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo2: e.target.value }))
                }
                placeholder="Ej: 12000"
              />
            </div>
            <div className="form-row">
              <label>3 x (total)</label>
              <input
                type="number"
                min="0"
                value={form.promo3}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo3: e.target.value }))
                }
                placeholder="Ej: 17000"
              />
            </div>
            <div className="form-row">
              <label>4 x (total)</label>
              <input
                type="number"
                min="0"
                value={form.promo4}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promo4: e.target.value }))
                }
                placeholder="Ej: 22000"
              />
            </div>
          </div>
          <div className="muted small">
            El valor ingresado es el TOTAL del pack (ej: 2 x $12.000).
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn" type="submit">
            {mode === "create" ? "Agregar producto" : "Guardar cambios"}
          </button>

          {mode === "edit" ? (
            <button className="btn btn-danger" type="button" onClick={handleDelete}>
              Eliminar producto
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("TODOS");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo contra entrega");

  const [adminUser, setAdminUser] = useState(null);
  const isAdmin = Boolean(adminUser);

  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeProducts(setProducts);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAdminUser(u || null));
    return () => unsub?.();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = normalizeText(search);
    return products.filter((p) => {
      const okCategory =
        activeCategory === "TODOS" ? true : p.category === activeCategory;
      if (!okCategory) return false;
      if (!q) return true;
      const hay = normalizeText(`${p.name} ${p.description} ${p.category}`);
      return hay.includes(q);
    });
  }, [products, activeCategory, search]);

  const qtyFor = (productId) =>
    cart.find((x) => x.productId === productId)?.quantity || 0;

  const cartCount = useMemo(
    () => cart.reduce((sum, it) => sum + (it.quantity || 0), 0),
    [cart]
  );

  const increment = (product) => {
    if (product.inStock === false) return;
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === product.id);
      if (!existing) return [...prev, { productId: product.id, quantity: 1 }];
      return prev.map((x) =>
        x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x
      );
    });
  };

  const decrement = (product) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === product.id);
      if (!existing) return prev;
      const nextQty = existing.quantity - 1;
      if (nextQty <= 0) return prev.filter((x) => x.productId !== product.id);
      return prev.map((x) =>
        x.productId === product.id ? { ...x, quantity: nextQty } : x
      );
    });
  };

  const changeQty = (productId, quantity) => {
    setCart((prev) => {
      const q = Number(quantity);
      if (Number.isNaN(q) || q <= 0) return prev.filter((x) => x.productId !== productId);
      const exists = prev.find((x) => x.productId === productId);
      if (!exists) return [...prev, { productId, quantity: q }];
      return prev.map((x) => (x.productId === productId ? { ...x, quantity: q } : x));
    });
  };

  const removeItem = (productId) =>
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  const clearCart = () => setCart([]);

  const checkout = (total) => {
    const items = cart
      .map((it) => {
        const p = products.find((x) => x.id === it.productId);
        if (!p) return null;
        const unit = getEffectiveUnitPrice(p, it.quantity);
        const base = Number(p.price ?? 0);
        const promo = unit !== base ? " (promo)" : "";
        return `- ${p.name} x${it.quantity} — ${formatCLP(unit)} c/u${promo} => ${formatCLP(unit * it.quantity)}`;
      })
      .filter(Boolean);

    const msg = [
      "🛒 *Pedido*",
      "",
      `👤 Nombre: ${customerName || "-"}`,
      `📍 Dirección: ${customerAddress || "-"}`,
      `🧭 Referencia: ${deliveryReference || "-"}`,
      `💳 Pago: ${paymentMethod || "-"}`,
      "",
      "*Detalle:*",
      ...items,
      "",
      `*TOTAL: ${formatCLP(total)}*`,
      "",
      "Muchas gracias",
    ].join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAdminLogin = async (email, password) => {
    await loginAdmin(email, password);
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
  };

  const handleCreate = async (payload) => {
    await createProduct(payload);
  };

  const handleUpdate = async (id, payload) => {
    await updateProduct(id, payload);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={logoBodeguita} alt="Bodeguita de la Mily" />
          <div>
            <h1>La Bodeguita de la Mily</h1>
            <div className="muted small">Precios convenientes todos los días para ti y tu familia.</div>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={() => setAdminOpen(true)}
            aria-label="Admin"
            title="Admin"
          >
            ⚙
          </button>

          <button
            className="icon-btn cart-btn"
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Carrito"
            title="Carrito"
          >
            🛒
            {cartCount > 0 ? <span className="cart-dot">{cartCount}</span> : null}
          </button>
        </div>
      </header>

      <div className="layout-desktop">
        <CategorySidebar activeCategory={activeCategory} onSelect={setActiveCategory} />

        <main className="catalog-area">
          <div className="card filters">
            <div className="filters-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos..."
              />

              {/* Móvil: solo desplegable (sin botones) */}
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="mobile-only"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty muted">No hay productos para mostrar.</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  quantityInCart={qtyFor(p.id)}
                  onIncrement={increment}
                  onDecrement={decrement}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL CARRITO */}
      <Modal open={cartOpen} title="Carrito" onClose={() => setCartOpen(false)}>
  <CartContent
    items={cart}
    products={products}
    onChangeQty={changeQty}
    onRemove={removeItem}
    onClear={clearCart}
    onCheckout={(total) => {
      checkout(total);
      clearCart();          // ← vacía el carrito
      setCartOpen(false);
    }}
          customerName={customerName}
          customerAddress={customerAddress}
          deliveryReference={deliveryReference}
          paymentMethod={paymentMethod}
          onCustomerNameChange={setCustomerName}
          onCustomerAddressChange={setCustomerAddress}
          onDeliveryReferenceChange={setDeliveryReference}
          onPaymentMethodChange={setPaymentMethod}
        />
      </Modal>

      {/* MODAL ADMIN */}
      <Modal open={adminOpen} title="Administración" onClose={() => setAdminOpen(false)}>
        <AdminContent
          adminUser={adminUser}
          isAdmin={isAdmin}
          products={products}
          onLogin={handleAdminLogin}
          onLogout={handleAdminLogout}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Modal>

      {/* FOOTER */}
      <footer className="app-footer">
        DESPACHO GRATIS EN STA. MARÍA DEL PEÑÓN,
ALTA VISTA DEL PEÑÓN, PORTEZUELO ORIENTE,
PORTEZUELO TOBALABA, TERRAZAS DE PTE. ALTO,
CUMBRES DEL PERAL Y CIUDAD DEL ESTE.
<p>INFO AL FONO +56987231623 </p>
      </footer>
    </div>
  );
}