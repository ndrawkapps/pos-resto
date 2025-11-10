// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Username dan password harus diisi.");
      return;
    }
    try {
      const user = await login({ username: username.trim(), password });
      if (user?.role === "admin") navigate("/beranda", { replace: true });
      else navigate("/cashier", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Login gagal.";
      setError(msg);
    }
  };

  return (
    <div className="login-wrapper full-page d-flex align-items-center justify-content-center">
      <Container fluid className="p-0 m-0">
        <Row className="g-0 h-100 justify-content-center align-items-center">
          <Col xs={10} sm={8} md={6} lg={4}>
            <Card className="shadow-sm">
              <Card.Body>
                <h4 className="text-center mb-3">POS Resto</h4>
                {error && (
                  <Alert
                    variant="danger"
                    onClose={() => setError(null)}
                    dismissible
                  >
                    {error}
                  </Alert>
                )}
                <Form onSubmit={handleSubmit} autoComplete="on">
                  <Form.Group className="mb-3" controlId="loginUsername">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="loginPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </Form.Group>
                  <div className="d-grid">
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
                          Memproses...
                        </>
                      ) : (
                        "Masuk"
                      )}
                    </Button>
                  </div>
                </Form>
                <div className="text-center mt-3 text-muted small">
                  © {new Date().getFullYear()} POS Resto
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
