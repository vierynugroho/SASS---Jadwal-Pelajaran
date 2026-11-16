"use client";

import { Children, Fragment, isValidElement, useEffect, useState, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-40",
};

export function Button({ variant = "primary", size = "md", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3.5 py-2 text-sm",
        variants[variant],
        className,
      )}
    />
  );
}

export const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, className)} />;
}

/** Teks polos dari children React (untuk label <option>). */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** Ubah <option>/<optgroup> (boleh bersarang di fragment/array) menjadi opsi Combo. */
function parseOptions(children: ReactNode, group?: string): ComboOption[] {
  const out: ComboOption[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement<{ value?: unknown; label?: string; disabled?: boolean; children?: ReactNode }>(c)) return;
    if (c.type === "option") {
      const label = textOf(c.props.children);
      out.push({ value: c.props.value === undefined ? label : String(c.props.value), label, group, disabled: c.props.disabled });
    } else if (c.type === "optgroup") {
      out.push(...parseOptions(c.props.children, c.props.label));
    } else if (c.type === Fragment) {
      out.push(...parseOptions(c.props.children, group));
    }
  });
  return out;
}

/**
 * Pengganti <select> bawaan: API sama (value, onChange(e.target.value), <option>, <optgroup>),
 * tetapi tampil memakai dropdown custom (Combo). Opsi bernilai "" menjadi placeholder.
 */
export function Select({ className, children, value, onChange, required, disabled }: SelectHTMLAttributes<HTMLSelectElement>) {
  const all = parseOptions(children);
  const empty = all.find((o) => o.value === "");
  const options = all.filter((o) => o.value !== "");
  const current = value == null ? "" : String(value);
  const emit = (v: string | null) =>
    onChange?.({ target: { value: v ?? "" }, currentTarget: { value: v ?? "" } } as unknown as ChangeEvent<HTMLSelectElement>);
  return (
    <span className={cx("relative block", className?.match(/\b(?:sm:|md:|lg:)?w-\S+/g)?.join(" "))}>
      <Combo
        value={current || null}
        options={options}
        onChange={emit}
        placeholder={empty?.label ?? "— Pilih —"}
        emptyLabel={current && empty ? empty.label : undefined}
        className={className?.replace(/\b(?:sm:|md:|lg:)?w-\S+/g, "")}
        disabled={disabled}
      />
      {/* Input tersembunyi agar validasi `required` pada form tetap jalan. */}
      {required && <input tabIndex={-1} aria-hidden required value={current} onChange={() => {}} className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0" />}
    </span>
  );
}

export function Field({ label, help, children, className }: { label: string; help?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-slate-400">{help}</span>}
    </label>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[10vh]" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600" aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Loading({ error }: { error?: string | null }) {
  return <div className={cx("py-10 text-center text-sm", error ? "text-red-600" : "text-slate-400")}>{error ?? "Memuat data…"}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; type: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, message, type }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
    };
    window.addEventListener("app-toast", on);
    return () => window.removeEventListener("app-toast", on);
  }, []);
  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 print:hidden" aria-live="polite">
      {items.map((t) => {
        const err = t.type === "error";
        return (
          <div
            key={t.id}
            role={err ? "alert" : "status"}
            className={cx(
              "flex items-start gap-2 rounded-md border-l-4 px-4 py-3 text-sm font-medium shadow-lg",
              err ? "border-red-600 bg-red-50 text-red-800" : "border-green-600 bg-green-50 text-green-800",
            )}
          >
            <span aria-hidden className={cx("mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white", err ? "bg-red-600" : "bg-green-600")}>
              <Icon name={err ? "alert" : "check"} size={12} />
            </span>
            <span className="whitespace-pre-line">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface ComboOption {
  value: string;
  label: string;
  /** Judul grup (opsi berurutan dengan grup sama ditampilkan bersama). */
  group?: string;
  /** Warna penanda di kiri (mis. warna mapel). */
  color?: string;
  /** Keterangan kecil di bawah label. */
  note?: string;
  /** Opsi tidak bisa dipilih; `note` menjelaskan alasannya. */
  disabled?: boolean;
}

/**
 * Dropdown custom: mendukung grup, warna, keterangan & opsi nonaktif.
 * Daftar memakai posisi fixed agar tidak terpotong card/scroll container.
 */
export function Combo({
  value,
  options,
  onChange,
  placeholder = "— Pilih —",
  emptyLabel,
  className,
  invalid,
  disabled,
}: {
  value: string | null | undefined;
  options: ComboOption[];
  onChange: (v: string | null) => void;
  placeholder?: string;
  /** Jika diisi, tampil sebagai opsi pertama untuk mengosongkan pilihan. */
  emptyLabel?: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const [btn, setBtn] = useState<HTMLButtonElement | null>(null);
  const selected = options.find((o) => o.value === value);
  const needle = q.trim().toLowerCase();
  const shown = needle ? options.filter((o) => `${o.label} ${o.note ?? ""} ${o.group ?? ""}`.toLowerCase().includes(needle)) : options;

  function toggle() {
    if (open || !btn) return setOpen(false);
    const r = btn.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 240 && above > below;
    setPos({
      left: r.left,
      width: Math.max(r.width, 240),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxH: Math.min(360, up ? above : below),
    });
    setQ("");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Tutup saat halaman di-scroll / resize agar daftar tidak "melayang" salah posisi.
    const onScroll = (e: Event) => !(e.target instanceof Node && document.getElementById("combo-pop")?.contains(e.target)) && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const pick = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={setBtn}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cx(inputCls, "flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400", invalid && "border-amber-400", open && "border-blue-500 ring-2 ring-blue-100", className)}
        style={selected?.color ? { borderLeft: `4px solid ${selected.color}` } : undefined}
      >
        <span className={cx("min-w-0 flex-1 truncate", !selected && "text-slate-400")}>{selected?.label ?? placeholder}</span>
        <Icon name="chevron" size={14} className={cx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onMouseDown={() => setOpen(false)} />
          <div
            id="combo-pop"
            className="fixed z-[61] flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-xl"
            style={{ left: Math.min(pos.left, window.innerWidth - pos.width - 8), width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            <div className="relative border-b border-slate-100 p-1.5">
              <Icon name="search" size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className={cx(inputCls, "py-1 pl-7")}
                placeholder="Cari…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  // Enter = pilih hasil pertama yang bisa dipilih.
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const first = shown.find((o) => !o.disabled);
                  if (first) pick(first.value);
                }}
              />
            </div>
            <div className="overflow-y-auto py-1">
              {emptyLabel && !q && (
                <button type="button" onClick={() => pick(null)} className="block w-full px-3 py-1.5 text-left text-slate-400 hover:bg-slate-50">
                  {emptyLabel}
                </button>
              )}
              {shown.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan “{q}”</div>}
              {shown.map((o, i) => (
                <div key={o.value}>
                  {o.group && o.group !== shown[i - 1]?.group && (
                    <div className="sticky top-0 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{o.group}</div>
                  )}
                  <button
                    type="button"
                    disabled={o.disabled}
                    onClick={() => pick(o.value)}
                    className={cx(
                      "flex w-full items-start gap-2 px-3 py-1.5 text-left",
                      o.disabled ? "cursor-not-allowed bg-red-50/40" : "hover:bg-blue-50",
                      o.value === value && "bg-blue-50 font-medium text-blue-700",
                    )}
                  >
                    <span className="mt-0.5 w-3.5 shrink-0 text-blue-600">{o.value === value && <Icon name="check" size={14} />}</span>
                    {o.color && <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: o.color }} />}
                    <span className="min-w-0 flex-1">
                      <span className={cx("block truncate", o.disabled && "text-slate-400 line-through")}>{o.label}</span>
                      {o.note && <span className={cx("block text-[11px]", o.disabled ? "text-red-600" : "text-slate-500")}>{o.note}</span>}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
