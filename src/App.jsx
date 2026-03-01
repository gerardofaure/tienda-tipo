import React, { useEffect, useMemo, useRef, useState } from "react";
import logoMiTienda from "./assets/logo-mitienda.png";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";
import {
  subscribeProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./firebase/products";
import { loginAdmin, logoutAdmin } from "./firebase/auth";
import { subscribeStoreSettings, updateStoreSettings } from "./firebase/settings";
import { placeOrder } from "./firebase/orders";

const WHATSAPP_NUMBER = "56987231623";
const CART_STORAGE_KEY = "mi_tienda_cart_v2"; // v2: sin variantes (migra desde v1 si existe)
const LEGACY_CART_STORAGE_KEY = "mi_tienda_cart_v1";

const CATEGORIES = [
  "TODO",
  "UTILES",
  "PANADERIA",
  "DEPORTE",
  "FRUTOS SECOS",
  "BELLEZA",
  "HERRAMIENTAS",
  "MASCOTAS ",
  "ROPA",
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
 * Promos como TOTAL por pack:
 * promos: { "2": 12000, "3": 17000, "4": 22000 }
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

/* ---------- Stock ---------- */
function getProductStock(product) {
  const sq = product?.stockQty;
  if (typeof sq === "number" && !Number.isNaN(sq)) return Math.max(0, Math.trunc(sq));
  return null; // null = sin control por cantidad
}
function isProductOutOfStock(product) {
  const sq = getProductStock(product);
  if (sq != null) return sq <= 0;
  return product?.inStock === false;
}

/* ---------- Modal genérico ---------- */
function Modal({ open, title, children, onClose, className = "" }) {
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
        className={`modal-card ${className}`}
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
        <div className="category-title">Mi Tienda</div>
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

function BannerCarousel({ slides, onClickSlide, className = "", compact = false }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 2000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides]);

  useEffect(() => {
    if (!slides || !slides.length) return;
    if (index >= slides.length) setIndex(0);
  }, [slides, index]);

  if (!slides || slides.length === 0) return null;

  const current = slides[index];

  return (
    <div className={`banner ${compact ? "banner-compact" : ""} ${className}`}>
      <div
        className="banner-slide"
        role="button"
        tabIndex={0}
        onClick={() => onClickSlide?.(current)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClickSlide?.(current);
        }}
      >
        <img className="banner-img" src={current.image} alt={current.title} />
        {/* <div className="banner-overlay"> */}<div className="banner-overlay">
          <div className="banner-title">{current.title}</div>
          {current.subtitle ? <div className="banner-subtitle">{current.subtitle}</div> : null}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="banner-dots" aria-label="Carrusel">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`banner-dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Ir a banner ${i + 1}`}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  quantityInCart,
  canIncrement,
  onIncrement,
  onDecrement,
  onImageClick,
}) {
  const isOutOfStock = isProductOutOfStock(product);
  const qty = quantityInCart || 0;

  const unit = getEffectiveUnitPrice(product, qty > 0 ? qty : 1);
  const promoText = promoSummary(product);
  const stockQty = getProductStock(product);

  return (
    <div className="card product-card">
      <div className="product-top">
        <div className="product-top-left">
          <span className="category-tag">{product.category}</span>
          {product.promoted ? <span className="promo-flag">⭐</span> : null}
        </div>

        {stockQty != null ? (
          stockQty <= 0 ? (
            <span className="stock-badge no-stock">SIN STOCK</span>
          ) : (
            <span className="stock-badge">{stockQty} disponibles</span>
          )
        ) : isOutOfStock ? (
          <span className="stock-badge no-stock">SIN STOCK</span>
        ) : null}
      </div>

      <button
        type="button"
        className="product-image-wrap product-image-btn"
        onClick={() => onImageClick?.(product)}
        aria-label={`Ver imagen completa de ${product.name}`}
        title="Ver imagen completa"
      >
        <img
          className="product-image"
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/1200x800?text=Sin+Imagen";
          }}
        />
      </button>

      <h3>{product.name}</h3>
      <p className="muted">{product.description}</p>

      {promoText ? <div className="promo-badge">Promo: {promoText}</div> : null}

      <div className="product-bottom">
        <div className="price-block">
          <div className="price">{formatCLP(unit)}</div>
          {promoText ? <div className="muted small">Precio unitario según cantidad</div> : null}
        </div>

        <div className="qty-controls">
          <button
            onClick={() => onDecrement(product)}
            disabled={qty <= 0}
            title={qty <= 0 ? "Aún no está en el carrito" : "Quitar 1"}
          >
            −
          </button>

          <span className={`qty-number ${qty > 0 ? "qty-number-active" : ""}`}>{qty}</span>

          <button
            onClick={() => onIncrement(product)}
            disabled={isOutOfStock || !canIncrement}
            title={
              isOutOfStock
                ? "Producto sin stock"
                : !canIncrement
                ? "No puedes agregar más que el stock disponible"
                : "Agregar 1"
            }
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
  freeShippingMin,
  onChangeQty,
  onRemove,
  onClear,
  onCheckout,
  customerName,
  customerPhone,
  customerAddress,
  deliveryReference,
  paymentMethod,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  onDeliveryReferenceChange,
  onPaymentMethodChange,
  canIncrementForProduct,
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

  const freeMin = Number(freeShippingMin || 0) || 0;
  const freeShipping = freeMin > 0 && Number(total || 0) >= freeMin;

  return (
    <div className="cart-modal-content">
      <div className="cart-summary-row">
        <span className="badge">{countItems} ítems</span>
        <button className="btn btn-outline btn-small" onClick={onClear} disabled={!hasItems}>
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
            const unitBase = getEffectiveUnitPrice(item.product, item.quantity);
            const isPromo = unitBase !== base;

            const key = item.productId;
            const canInc = canIncrementForProduct(item.product);

            return (
              <div key={key} className="cart-item">
                <div>
                  <div className="cart-item-name">{item.product.name}</div>
                  <div className="muted small">
                    Unit: {formatCLP(unit)}
                    {isPromo ? <span className="promo-inline"> (promo)</span> : null}
                  </div>
                </div>

                <div className="qty-controls">
                  <button onClick={() => onChangeQty(item.productId, item.quantity - 1)}>−</button>
                  <span className="qty-number qty-number-active">{item.quantity}</span>
                  <button
                    onClick={() => onChangeQty(item.productId, item.quantity + 1)}
                    disabled={!canInc}
                    title={!canInc ? "Stock máximo alcanzado" : "Agregar 1"}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div className="cart-subtotal">{formatCLP(unit * item.quantity)}</div>
                  <button className="btn btn-outline btn-small" onClick={() => onRemove(item.productId)}>
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
          <input value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} placeholder="Tu nombre" />
        </div>

        <div className="form-row">
          <label>Teléfono</label>
          <input
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="Ej: +56 9 1234 5678"
          />
        </div>

        <div className="form-row">
          <label>Medio de pago</label>
          <select value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)}>
            <option value="Efectivo contra entrega">Efectivo contra entrega</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>

        <div className="form-row">
          <label>Dirección</label>
          <input value={customerAddress} onChange={(e) => onCustomerAddressChange(e.target.value)} placeholder="Dirección" />
        </div>

        <div className="form-row">
          <label>Referencia</label>
          <input
            value={deliveryReference}
            onChange={(e) => onDeliveryReferenceChange(e.target.value)}
            placeholder="Ej: portón negro, casa esquina..."
          />
        </div>

        {freeMin > 0 ? (
          <div className={`free-ship ${freeShipping ? "ok" : ""}`}>
            {freeShipping ? (
              <strong>Despacho gratis aplicado</strong>
            ) : (
              <span>
                Despacho gratis desde <strong>{formatCLP(freeMin)}</strong>
              </span>
            )}
          </div>
        ) : null}

        <div className="cart-total-row">
          <strong>Total</strong>
          <strong>{formatCLP(total)}</strong>
        </div>

        <button className="btn btn-success" onClick={() => onCheckout(total)} disabled={!hasItems}>
          Enviar a WhatsApp
        </button>
      </div>

      <div className="card info-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Despacho</h3>
        <div className="muted small">
          Se enviará tu pedido a WhatsApp con el detalle y total. El pedido se guardará en el sistema y rebajará stock si el
          producto tiene stockQty.
        </div>
      </div>
    </div>
  );
}

function AdminContent({
  adminUser,
  isAdmin,
  products,
  storeSettings,
  onLogin,
  onLogout,
  onCreate,
  onUpdate,
  onDelete,
  onUpdateStoreSettings,
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authError, setAuthError] = useState("");

  const [mode, setMode] = useState("create");
  const [selectedId, setSelectedId] = useState("");

  const [settingsForm, setSettingsForm] = useState({
    freeShippingMin: String(storeSettings?.freeShippingMin ?? 0),
  });

  useEffect(() => {
    setSettingsForm({ freeShippingMin: String(storeSettings?.freeShippingMin ?? 0) });
  }, [storeSettings?.freeShippingMin]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: CATEGORIES.filter((c) => c !== "TODO")[0] || "UTILES",
    image: "",
    inStock: true,
    stockQty: "",
    promoted: false,
    sortOrder: "",
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
        category: CATEGORIES.filter((c) => c !== "TODO")[0] || "UTILES",
        image: "",
        inStock: true,
        stockQty: "",
        promoted: false,
        sortOrder: "",
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
      category: p.category || (CATEGORIES.filter((c) => c !== "TODO")[0] || "UTILES"),
      image: p.image || "",
      inStock: p.inStock !== false,
      stockQty:
        typeof p.stockQty === "number" && !Number.isNaN(p.stockQty)
          ? String(Math.trunc(p.stockQty))
          : "",
      promoted: Boolean(p.promoted),
      sortOrder: p.sortOrder != null ? String(p.sortOrder) : "",
      promo2: p.promos?.["2"] ? String(p.promos["2"]) : "",
      promo3: p.promos?.["3"] ? String(p.promos["3"]) : "",
      promo4: p.promos?.["4"] ? String(p.promos["4"]) : "",
    });
  }, [mode, selectedId, products]);

  const categoriesWithoutTodos = CATEGORIES.filter((c) => c !== "TODO");

  const toNumberOrNull = (v) => {
    const n = Number(v);
    if (v === "" || v == null) return null;
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
  };

  const toIntegerOrNull = (v) => {
    const n = Number(v);
    if (v === "" || v == null) return null;
    if (Number.isNaN(n)) return null;
    return Math.trunc(n);
  };

  const buildPayload = () => {
    const price = Number(form.price);

    const promos = {
      "2": toNumberOrNull(form.promo2),
      "3": toNumberOrNull(form.promo3),
      "4": toNumberOrNull(form.promo4),
    };

    const stockQty = form.stockQty === "" ? null : toIntegerOrNull(form.stockQty);

    const derivedInStock =
      typeof stockQty === "number" && !Number.isNaN(stockQty) ? stockQty > 0 : Boolean(form.inStock);

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      category: form.category,
      image: form.image.trim(),
      inStock: derivedInStock,
      stockQty,
      promoted: Boolean(form.promoted),
      sortOrder: toIntegerOrNull(form.sortOrder),
      promos,
      variants: [],
    };
  };

  const validatePayload = (payload) => {
    if (!payload.name || !payload.description || !payload.image)
      return "Completa nombre, descripción e imagen.";
    if (Number.isNaN(payload.price) || payload.price < 0) return "Ingresa un precio válido.";
    if (payload.stockQty != null && (Number.isNaN(payload.stockQty) || payload.stockQty < 0))
      return "Stock inválido (debe ser 0 o más).";
    return "";
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      setAuthError("");
      await onLogin(email, pass);
    } catch (err) {
      console.error(err);
      setAuthError(err?.message || "Error autenticando.");
    }
  };

  const handleSaveSettings = async () => {
    const v = Number(settingsForm.freeShippingMin);
    if (Number.isNaN(v) || v < 0) {
      alert("Monto mínimo inválido (debe ser 0 o más).");
      return;
    }
    try {
      await onUpdateStoreSettings({ freeShippingMin: Math.trunc(v) });
      alert("Configuración guardada.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error guardando configuración.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = buildPayload();
    const validation = validatePayload(payload);
    if (validation) {
      alert(validation);
      return;
    }

    try {
      if (mode === "create") {
        await onCreate(payload);
        alert("Producto creado.");
        setMode("create");
      } else {
        if (!selectedId) {
          alert("Selecciona un producto para editar.");
          return;
        }
        await onUpdate(selectedId, payload);
        alert("Producto actualizado.");
      }
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
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@tu-dominio.cl" />
          </div>
          <div className="form-row">
            <label>Clave</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          {authError ? <div className="error">{authError}</div> : null}
          <button className="btn" type="submit">Ingresar</button>
          <div className="muted small" style={{ marginTop: 8 }}>
            * Por ahora, cualquier usuario logueado cuenta como admin.
          </div>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="error">Este usuario no tiene permisos de Admin.</div>
        <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={onLogout}>
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

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="category-title" style={{ marginBottom: 10 }}>
          Configuración de despacho
        </div>
        <div className="field-grid">
          <div className="form-row">
            <label>Monto mínimo para despacho gratis ($)</label>
            <input
              type="number"
              min="0"
              value={settingsForm.freeShippingMin}
              onChange={(e) => setSettingsForm((s) => ({ ...s, freeShippingMin: e.target.value }))}
              placeholder="Ej: 20000"
            />
          </div>
          <div className="form-row" style={{ alignSelf: "end" }}>
            <button className="btn" type="button" onClick={handleSaveSettings}>
              Guardar
            </button>
          </div>
        </div>
        <div className="muted small">
          El banner de promociones se arma solo con productos marcados como <strong>Promocionado</strong>.
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`chip ${mode === "create" ? "active" : ""}`} onClick={() => setMode("create")} type="button">
          Agregar nuevo
        </button>
        <button className={`chip ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")} type="button">
          Editar / Eliminar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        {mode === "edit" ? (
          <div className="form-row">
            <label>Producto existente</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Selecciona un producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.promoted ? "⭐ " : ""}
                  {p.name} — {p.category}
                  {p.sortOrder != null ? ` — orden ${p.sortOrder}` : ""}
                  {isProductOutOfStock(p) ? " (Sin stock)" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="form-row">
          <label>Nombre</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="form-row">
          <label>Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="field-grid">
          <div className="form-row">
            <label>Precio ($)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <label>Stock (cantidad real)</label>
            <input
              type="number"
              min="0"
              value={form.stockQty}
              onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
              placeholder="Ej: 12"
            />
            <div className="muted small">
              Si lo dejas vacío, no se controla stock por cantidad (compatibilidad).
            </div>
          </div>
        </div>

        <div className="field-grid">
          <div className="form-row">
            <label>Categoría</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {categoriesWithoutTodos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Orden de aparición (menor = primero)</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="Ej: 1"
            />
          </div>
        </div>

        <div className="field-grid">
          <div className="form-row checkbox-row">
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={form.promoted}
                onChange={(e) => setForm((f) => ({ ...f, promoted: e.target.checked }))}
              />
              <span>Promocionado (aparece en el banner)</span>
            </label>
            <div className="muted small">Marca esto para que el producto salga en el carrusel superior.</div>
          </div>

          <div className="form-row checkbox-row">
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
              />
              <span>Disponible en stock (manual)</span>
            </label>
            <div className="muted small">Si usas Stock real, este checkbox se ignora.</div>
          </div>
        </div>

        <div className="form-row">
          <label>URL de imagen</label>
          <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
        </div>

        <div className="promo-box">
          <div className="promo-title">Promociones (TOTAL por pack)</div>
          <div className="promo-grid">
            <div className="form-row">
              <label>2 x (total)</label>
              <input type="number" min="0" value={form.promo2} onChange={(e) => setForm((f) => ({ ...f, promo2: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>3 x (total)</label>
              <input type="number" min="0" value={form.promo3} onChange={(e) => setForm((f) => ({ ...f, promo3: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>4 x (total)</label>
              <input type="number" min="0" value={form.promo4} onChange={(e) => setForm((f) => ({ ...f, promo4: e.target.value }))} />
            </div>
          </div>
          <div className="muted small">El valor ingresado es el TOTAL del pack (ej: 2 x $12.000).</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn" type="submit">{mode === "create" ? "Agregar producto" : "Guardar cambios"}</button>
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

/* ---------- helpers carrito (migración) ---------- */
function migrateLegacyCart(raw) {
  if (!Array.isArray(raw)) return [];
  const map = new Map();
  for (const it of raw) {
    const id = it?.productId;
    const q = Math.trunc(Number(it?.quantity || 0));
    if (!id || Number.isNaN(q) || q <= 0) continue;
    map.set(id, (map.get(id) || 0) + q);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function loadCartFromStorage() {
  try {
    const raw2 = localStorage.getItem(CART_STORAGE_KEY);
    if (raw2) {
      const parsed = JSON.parse(raw2);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  try {
    const raw1 = localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    if (raw1) {
      const parsed = JSON.parse(raw1);
      const migrated = migrateLegacyCart(parsed);
      return migrated;
    }
  } catch {}

  return [];
}

/* ---------- App ---------- */
export default function App() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("TODO");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState(() => loadCartFromStorage());

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo contra entrega");

  const [storeSettings, setStoreSettings] = useState({ freeShippingMin: 0 });

  const [adminUser, setAdminUser] = useState(null);
  const isAdmin = Boolean(adminUser);

  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const [imageOpen, setImageOpen] = useState(false);
  const [imageData, setImageData] = useState({ src: "", title: "" });

  // ✅ refs de tarjetas por productId (para scroll desde banner)
  const productCardRefs = useRef({});

  useEffect(() => {
    const unsub = subscribeProducts(setProducts);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = subscribeStoreSettings(setStoreSettings);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAdminUser(u || null));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart || []));
    } catch {}
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const q = normalizeText(search);
    const base = products.filter((p) => {
      const okCategory = activeCategory === "TODO" ? true : p.category === activeCategory;
      if (!okCategory) return false;
      if (!q) return true;
      const hay = normalizeText(`${p.name} ${p.description} ${p.category}`);
      return hay.includes(q);
    });

    return base.slice().sort((a, b) => {
      const ap = a.promoted ? 1 : 0;
      const bp = b.promoted ? 1 : 0;
      if (ap !== bp) return bp - ap;

      const ao = a.sortOrder == null ? Number.POSITIVE_INFINITY : Number(a.sortOrder);
      const bo = b.sortOrder == null ? Number.POSITIVE_INFINITY : Number(b.sortOrder);
      if (ao !== bo) return ao - bo;

      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });
  }, [products, activeCategory, search]);

  const qtyForProduct = (productId) => {
    const it = cart.find((x) => x.productId === productId);
    return it ? it.quantity || 0 : 0;
  };

  const cartCount = useMemo(() => cart.reduce((sum, it) => sum + (it.quantity || 0), 0), [cart]);

  const canIncrementForProduct = (product) => {
    const sq = getProductStock(product);
    if (sq == null) return product?.inStock !== false;
    const inCart = qtyForProduct(product.id);
    return inCart < sq;
  };

  const increment = (product) => {
    if (isProductOutOfStock(product)) return;
    if (!canIncrementForProduct(product)) return;

    setCart((prev) => {
      const sq = getProductStock(product);
      const current = prev.find((x) => x.productId === product.id);
      const currentQty = current?.quantity || 0;

      if (sq != null && currentQty >= sq) return prev;

      if (!current) return [...prev, { productId: product.id, quantity: 1 }];

      return prev.map((x) =>
        x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x
      );
    });
  };

  const decrement = (product) => {
    setCart((prev) => {
      const current = prev.find((x) => x.productId === product.id);
      if (!current) return prev;
      const nextQty = (current.quantity || 0) - 1;
      if (nextQty <= 0) return prev.filter((x) => x.productId !== product.id);
      return prev.map((x) => (x.productId === product.id ? { ...x, quantity: nextQty } : x));
    });
  };

  const changeQty = (productId, quantity) => {
    const q = Math.trunc(Number(quantity || 0));

    setCart((prev) => {
      if (Number.isNaN(q) || q <= 0) return prev.filter((x) => x.productId !== productId);

      const product = products.find((p) => p.id === productId);
      const sq = getProductStock(product);

      let clamped = q;
      if (sq != null) clamped = Math.min(q, sq);

      const exists = prev.find((x) => x.productId === productId);
      if (!exists) return [...prev, { productId, quantity: clamped }];

      return prev.map((x) => (x.productId === productId ? { ...x, quantity: clamped } : x));
    });
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((x) => x.productId !== productId));

  const clearCart = () => {
    setCart([]);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
    } catch {}
  };

  const clearCartAfterOrder = () => {
    setCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {}
  };

  const checkout = async (total) => {
    if (!cart.length) return;
    if (!customerPhone.trim()) {
      alert("Por favor ingresa tu teléfono para guardar tu pedido.");
      return;
    }

    try {
      await placeOrder({
        customerName,
        customerPhone,
        customerAddress,
        deliveryReference,
        paymentMethod,
        items: cart.map((it) => ({
          productId: it.productId,
          variantKey: "__default",
          variants: {},
          quantity: Math.trunc(Number(it.quantity || 0)),
        })),
        total,
      });
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo guardar el pedido. Intenta nuevamente.");
      return;
    }

    const lines = cart
      .map((it) => {
        const p = products.find((x) => x.id === it.productId);
        if (!p) return null;

        const unit = getEffectiveUnitPrice(p, it.quantity);
        const base = Number(p.price ?? 0);
        const unitBase = getEffectiveUnitPrice(p, it.quantity);
        const isPromo = unitBase !== base;

        const promo = isPromo ? " (promo)" : "";

        return `- ${p.name} x${it.quantity}\n   • ${formatCLP(unit)} c/u${promo} => ${formatCLP(unit * it.quantity)}`;
      })
      .filter(Boolean);

    const freeMin = Number(storeSettings?.freeShippingMin || 0) || 0;
    const freeShipping = freeMin > 0 && Number(total || 0) >= freeMin;

    const msg = [
      "🛒 *Pedido*",
      "",
      `👤 Nombre: ${customerName || "-"}`,
      `📞 Teléfono: ${customerPhone || "-"}`,
      `📍 Dirección: ${customerAddress || "-"}`,
      `🧭 Referencia: ${deliveryReference || "-"}`,
      `💳 Pago: ${paymentMethod || "-"}`,
      freeMin > 0 ? `🚚 Despacho: ${freeShipping ? "GRATIS" : `Desde ${formatCLP(freeMin)}`}` : null,
      "",
      "*Detalle:*",
      ...lines,
      "",
      `*TOTAL: ${formatCLP(total)}*`,
      "",
      "Muchas gracias",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    clearCartAfterOrder();
  };

  const openImageModal = (product) => {
    const src = (product?.image || "").trim();
    if (!src) return;
    setImageData({ src, title: product?.name || "Imagen" });
    setImageOpen(true);
  };

  // ✅ Banner: texto fijo
  const bannerSlides = useMemo(() => {
    const promos = products
      .filter((p) => Boolean(p.promoted) && (p.image || "").trim())
      .slice()
      .sort((a, b) => {
        const ao = a.sortOrder == null ? Number.POSITIVE_INFINITY : Number(a.sortOrder);
        const bo = b.sortOrder == null ? Number.POSITIVE_INFINITY : Number(b.sortOrder);
        return ao - bo;
      });

    return promos.slice(0, 8).map((p) => ({
      productId: p.id,
      category: p.category,
      image: p.image,
      title: "Producto destacado",
      subtitle: "",
    }));
  }, [products]);

  // ✅ Click banner: ir a tarjeta del producto
  const handleBannerClick = (slide) => {
    const productId = slide?.productId;
    if (!productId) return;

    const p = products.find((x) => x.id === productId);
    if (!p) return;

    // Si estás filtrando por otra categoría, cámbiala para que la tarjeta exista en pantalla
    const needsCategoryChange = activeCategory !== "TODO" && activeCategory !== p.category;

    if (needsCategoryChange) {
      setActiveCategory(p.category);
      setSearch("");
      // esperar render y luego scroll
      setTimeout(() => {
        const node = productCardRefs.current[productId];
        node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }

    // misma categoría (o TODO): solo scroll
    requestAnimationFrame(() => {
      const node = productCardRefs.current[productId];
      node?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div className="app-shell">
      {/* MOBILE HEADER (solo móvil) */}
      <header className="topbar mobile-only">
        <div className="topbar-inner">
          <div className="brand">
            <img className="brand-logo" src={logoMiTienda} alt="Mi Tienda" />
            <div>
              <h1>Mi Tienda</h1>
              <div className="muted small">Todo lo que necesitas</div>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              type="button"
              onClick={() => setAdminOpen(true)}
              aria-label="Edición"
              title="Edición"
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
        </div>
      </header>

      <div className="layout-desktop">
        <CategorySidebar activeCategory={activeCategory} onSelect={setActiveCategory} />

        <main className="catalog-area">
          {/* DESKTOP STRIP (solo escritorio) */}
          <div className="desktop-top-strip desktop-only">
            {/* Todo en el mismo contenedor para alinear horizontalmente */}
            <div className="brand brand-inline desktop-strip-brand">
              <img className="brand-logo" src={logoMiTienda} alt="Mi Tienda" />
              <div>
                <h1>Mi Tienda</h1>
                <div className="muted small">Todo lo que necesitas</div>
              </div>
            </div>

            <div className="desktop-strip-banner">
              <BannerCarousel
                slides={bannerSlides}
                onClickSlide={handleBannerClick}
                className="banner-desktop"
                compact
              />
            </div>

            <div className="desktop-strip-actions">
              <button
                className="icon-btn"
                type="button"
                onClick={() => setAdminOpen(true)}
                aria-label="Edición"
                title="Edición"
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
          </div>

          {/* MOBILE BANNER (solo móvil) */}
          <div className="mobile-only">
            <BannerCarousel slides={bannerSlides} onClickSlide={handleBannerClick} />
          </div>

          <div className="card filters">
            <div className="filters-row">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." />

              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="mobile-only"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                ref={(el) => {
                  if (el) productCardRefs.current[p.id] = el;
                }}
              >
                <ProductCard
                  product={p}
                  quantityInCart={qtyForProduct(p.id)}
                  canIncrement={canIncrementForProduct(p)}
                  onIncrement={increment}
                  onDecrement={decrement}
                  onImageClick={openImageModal}
                />
              </div>
            ))}
          </div>

          <footer className="footer">
            Despacho gratis en zonas centrales - Info al fono +56987231623
          </footer>
        </main>
      </div>

      {/* Carrito */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Carrito Mi Tienda">
        <CartContent
          items={cart}
          products={products}
          freeShippingMin={storeSettings?.freeShippingMin || 0}
          onChangeQty={changeQty}
          onRemove={removeItem}
          onClear={clearCart}
          onCheckout={checkout}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          deliveryReference={deliveryReference}
          paymentMethod={paymentMethod}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          onCustomerAddressChange={setCustomerAddress}
          onDeliveryReferenceChange={setDeliveryReference}
          onPaymentMethodChange={setPaymentMethod}
          canIncrementForProduct={canIncrementForProduct}
        />
      </Modal>

      {/* Admin */}
      <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title="Edición">
        <AdminContent
          adminUser={adminUser}
          isAdmin={isAdmin}
          products={products}
          storeSettings={storeSettings}
          onLogin={loginAdmin}
          onLogout={logoutAdmin}
          onCreate={createProduct}
          onUpdate={updateProduct}
          onDelete={deleteProduct}
          onUpdateStoreSettings={updateStoreSettings}
        />
      </Modal>

      {/* Modal imagen */}
      <Modal open={imageOpen} onClose={() => setImageOpen(false)} title={imageData.title} className="image-modal">
        <div className="image-modal-body">
          <img className="image-modal-img" src={imageData.src} alt={imageData.title} />
        </div>
      </Modal>
    </div>
  );
}