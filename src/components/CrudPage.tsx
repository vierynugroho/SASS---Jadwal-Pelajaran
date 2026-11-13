"use client";

import { useState, type ReactNode } from "react";
import { api, toast, useApi } from "@/lib/client";
import { Button, Card, Empty, Field, Input, Loading, Modal, PageHeader, Select } from "./ui";
import { intError, type IntLimit } from "@/lib/limits";

type Row = { _id: string } & Record<string, unknown>;
type Values = Record<string, unknown>;

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "color" | "select" | "multi" | "boolean" | "password";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Untuk select: sembunyikan pilihan kosong. */
  noEmpty?: boolean;
  /** Batas angka untuk field number (divalidasi sebelum simpan). */
  limit?: IntLimit;
  /** Tampilkan field hanya jika kondisi terpenuhi. */
  show?: (values: Values) => boolean;
}

export interface ColumnDef<T> {
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function CrudPage<T extends Row>({
  title,
  description,
  endpoint,
  fields,
  columns,
  empty,
  singular,
  onChanged,
  canCreate = true,
  rowActions,
  confirmDelete,
}: {
  title: string;
  description?: string;
  endpoint: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  empty: Values;
  singular: string;
  onChanged?: () => void;
  canCreate?: boolean;
  rowActions?: (row: T) => ReactNode;
  /** Pesan konfirmasi hapus kustom. */
  confirmDelete?: (row: T) => string;
}) {
  const { data, error, reload } = useApi<T[]>(endpoint);
  const [form, setForm] = useState<Values | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const openNew = () => {
    setEditId(null);
    setForm({ ...empty });
  };
  const openEdit = (row: T) => {
    setEditId(row._id);
    setForm(Object.fromEntries(Object.keys(empty).map((k) => [k, row[k] ?? empty[k]])));
  };
  const close = () => setForm(null);

  const visibleFields = form ? fields.filter((f) => !f.show || f.show(form)) : [];
  const fieldErrors = Object.fromEntries(
    visibleFields
      .filter((f) => f.type === "number" && f.limit)
      .map((f) => [f.name, intError(form![f.name], f.limit!, { optional: !f.required })])
      .filter(([, e]) => e),
  ) as Record<string, string>;
  const hasErrors = Object.keys(fieldErrors).length > 0;

  async function save(keepOpen = false) {
    if (!form || hasErrors) return;
    setSaving(true);
    try {
      await api(editId ? `${endpoint}/${editId}` : endpoint, { method: editId ? "PUT" : "POST", body: form });
      toast(`${singular} berhasil disimpan`);
      reload();
      onChanged?.();
      if (keepOpen && !editId) setForm({ ...empty });
      else close();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: T) {
    if (!confirm(confirmDelete?.(row) ?? `Hapus ${singular.toLowerCase()} "${String(row.name)}"?`)) return;
    try {
      await api(`${endpoint}/${row._id}`, { method: "DELETE" });
      toast(`${singular} dihapus`);
      reload();
      onChanged?.();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const rows = (data ?? []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title={title} description={description} actions={canCreate ? <Button onClick={openNew}>+ Tambah {singular}</Button> : undefined} />
      {!data ? (
        <Loading error={error} />
      ) : data.length === 0 ? (
        <Empty>
          Belum ada data.{" "}
          {canCreate && <button className="font-medium text-blue-600 hover:underline" onClick={openNew}>Tambah {singular.toLowerCase()}</button>}
        </Empty>
      ) : (
        <Card>
          <div className="border-b border-slate-200 p-3">
            <Input placeholder="Cari…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-2.5">No</th>
                  {columns.map((c) => (
                    <th key={c.label} className={`px-4 py-2.5 ${c.className ?? ""}`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="w-32 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.label} className={`px-4 py-2.5 ${c.className ?? ""}`}>
                        {c.render(row)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {rowActions?.(row)}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                        Ubah
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row)}>
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!form} title={`${editId ? "Ubah" : "Tambah"} ${singular}`} onClose={close}>
        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-4"
          >
            {visibleFields.map((f) => (
              <Field key={f.name} label={f.label + (f.required ? " *" : "")} help={fieldErrors[f.name] ? undefined : f.help}>
                <FieldInput def={f} value={form[f.name]} invalid={!!fieldErrors[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} />
                {fieldErrors[f.name] && <span className="mt-1 block text-xs text-red-600">{fieldErrors[f.name]}</span>}
              </Field>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={close}>
                Batal
              </Button>
              {!editId && canCreate && (
                <Button type="button" variant="secondary" disabled={saving || hasErrors} onClick={() => save(true)}>
                  Simpan & tambah lagi
                </Button>
              )}
              <Button type="submit" disabled={saving || hasErrors}>
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function FieldInput({ def, value, onChange, invalid }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; invalid?: boolean }) {
  switch (def.type) {
    case "number":
      return (
        <Input
          type="number"
          step={1}
          min={def.limit?.min ?? 1}
          max={def.limit?.max}
          className={invalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : undefined}
          value={value == null ? "" : String(value)}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={String(value || "#3b82f6")} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-slate-300" />
          <span className="text-xs text-slate-500">{String(value)}</span>
        </div>
      );
    case "select":
      return (
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)}>
          {(!def.noEmpty || !value) && <option value="">{def.noEmpty ? "— Pilih —" : "— Tidak ada —"}</option>}
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "multi": {
      const set = new Set((value as string[]) ?? []);
      if (!def.options?.length) return <p className="text-xs text-slate-400">Belum ada pilihan.</p>;
      return (
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-slate-300 p-2">
          {def.options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={set.has(o.value)}
                onChange={(e) => {
                  const next = new Set(set);
                  if (e.target.checked) next.add(o.value);
                  else next.delete(o.value);
                  onChange([...next]);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          {def.placeholder ?? "Ya"}
        </label>
      );
    case "password":
      return <Input type="password" autoComplete="new-password" value={String(value ?? "")} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <Input value={String(value ?? "")} required={def.required} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}
