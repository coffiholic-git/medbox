import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { useStore } from "../store/useStore";
import { useSpeech } from "../hooks/useSpeech";
import MedicineCard from "../components/MedicineCard";
import Modal from "../components/Modal";
import { colorTokens } from "../data/seed";

const emptyForm = {
  name: "",
  strength: "",
  form: "Tablet",
  frequency: "daily",
  time: "9:00 AM",
  instructions: "",
  color: "mint",
};

const filters = [
  { id: "all", label: "All" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "asNeeded", label: "As needed" },
];

export default function Library() {
  const medicines = useStore((s) => s.medicines);
  const addMedicine = useStore((s) => s.addMedicine);
  const updateMedicine = useStore((s) => s.updateMedicine);
  const removeMedicine = useStore((s) => s.removeMedicine);
  const pushToast = useStore((s) => s.pushToast);
  const { speak } = useSpeech();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchesQuery = `${m.name} ${m.strength}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || m.frequency === filter;
      return matchesQuery && matchesFilter;
    });
  }, [medicines, query, filter]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (medicine) => {
    setForm({ ...emptyForm, ...medicine });
    setEditingId(medicine.id);
    setFormOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.strength.trim()) return;
    const instructions = form.instructions.trim() || `${form.form} · ${form.time}`;
    if (editingId) {
      updateMedicine(editingId, { ...form, instructions });
      pushToast(`${form.name} was updated.`, "success");
    } else {
      addMedicine({ ...form, instructions });
      pushToast(`${form.name} was added to your library.`, "success");
    }
    setFormOpen(false);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    removeMedicine(confirmDelete.id);
    pushToast(`${confirmDelete.name} was removed.`);
    setConfirmDelete(null);
  };

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wide text-mint">Available offline</span>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-ink">Your medicines</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-mint-dim px-5 py-2.5 text-[13.5px] font-bold text-navy-950 transition hover:bg-mint"
        >
          <Plus size={16} strokeWidth={2.5} /> Add medicine
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your medicines"
            aria-label="Search your medicines"
            className="w-full rounded-full border border-line bg-navy-800/60 py-3 pl-11 pr-4 text-[14px] text-ink placeholder:text-muted focus:border-mint"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${
                filter === f.id ? "border-mint-dim bg-mint-dim text-navy-950" : "border-line text-muted hover:border-mint/50 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((m) => (
            <MedicineCard
              key={m.id}
              medicine={m}
              onSpeak={speak}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-navy-800/40 p-10 text-center">
            <p className="text-[15px] font-bold text-ink">No medicines match your search.</p>
            <p className="mt-1 text-[13.5px] text-muted">Try a different term, or add a new medicine.</p>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit medicine" : "Add a medicine"}
        labelledBy="formTitle"
      >
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Paracetamol"
              />
            </Field>
            <Field label="Strength">
              <input
                required
                value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                className="input"
                placeholder="500 mg"
              />
            </Field>
            <Field label="Form">
              <select value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} className="input">
                {["Tablet", "Capsule", "Softgel", "Liquid", "Injection"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Frequency">
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="asNeeded">As needed</option>
              </select>
            </Field>
            <Field label="Time">
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="input"
                placeholder="8:00 PM"
              />
            </Field>
            <Field label="Accent color">
              <div className="flex items-center gap-2 pt-1">
                {Object.keys(colorTokens).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={c}
                    aria-pressed={form.color === c}
                    className={`h-9 w-9 rounded-full ${colorTokens[c].bg} ${
                      form.color === c ? "ring-2 ring-offset-2 ring-offset-navy-800 ring-ink" : ""
                    }`}
                  />
                ))}
              </div>
            </Field>
          </div>
          <Field label="Instructions (optional)">
            <input
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="input"
              placeholder="1 tablet · after dinner"
            />
          </Field>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-full border border-line py-3 text-[14px] font-bold text-ink hover:border-coral hover:text-coral"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-full bg-mint-dim py-3 text-[14px] font-bold text-navy-950 hover:bg-mint">
              {editingId ? "Save changes" : "Add medicine"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove this medicine?" labelledBy="deleteTitle" width="max-w-sm">
        {confirmDelete && (
          <div>
            <p className="text-[14px] text-muted">
              {confirmDelete.name} {confirmDelete.strength} will be removed from your library and schedule.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-full border border-line py-3 text-[14px] font-bold text-ink hover:border-mint hover:text-mint"
              >
                Keep it
              </button>
              <button onClick={doDelete} className="flex-1 rounded-full bg-coral py-3 text-[14px] font-bold text-navy-950 hover:brightness-110">
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold text-muted">{label}</span>
      {children}
    </label>
  );
}
