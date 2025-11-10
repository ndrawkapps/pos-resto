// frontend/src/components/OpenShiftModal.jsx
import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import axios from "axios";

export default function OpenShiftModal({ show, onClose, token }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

  async function submit() {
    setErr(null);
    const val = Number(amount);
    if (isNaN(val) || val < 0) {
      setErr("Jumlah modal harus angka dan >= 0");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/api/cashregisters/open`,
        { openingAmount: val, note },
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
      );
      onClose(true);
    } catch (e) {
      console.error("OpenShift submit err:", e);
      setErr(e?.response?.data?.message || e.message || "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Header>
        <Modal.Title>Input Modal Awal</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Masukkan jumlah modal kasir untuk hari ini sebelum mulai shift.</p>
        {err && <Alert variant="danger">{err}</Alert>}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Jumlah Modal (Rp)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Catatan (opsional)</Form.Label>
            <Form.Control
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. kas kecil"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => onClose(false)}
          disabled={loading}
        >
          Batal
        </Button>
        <Button variant="primary" onClick={submit} disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan & Mulai Shift"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
