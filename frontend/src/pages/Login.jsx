// frontend/src/pages/Login.jsx
import React, { useState } from "react";
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
import { useAuth } from "../contexts/AuthContext.jsx"; // sesuaikan path jika perlu

/**
 * Login component: will try to use AuthContext.login() if available.
 * If parent passes an `onLogin` prop (legacy), it will call that instead.
 *
 * Usage:
 * - With AuthContext: <Login />
 * - With prop: <Login onLogin={someHandler} />
 */
function Login({ onLogin }) {
  // prefer context-based login if available
  const ctx = useAuth ? useAuth() : null;
  const contextLogin = ctx?.login;
  const contextLoading = ctx?.loading ?? false;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // effective loading: context loading (if present) OR local loading
  const loading = contextLoading || localLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    // prefer context login if provided
    if (typeof contextLogin === "function" && !onLogin) {
      try {
        await contextLogin({ username, password });
        // success -> AuthContext typically handles redirect
      } catch (err) {
        // normalize error message
        const msg = err?.response?.data?.error || err?.message || String(err);
        setError(msg);
      }
      return;
    }

    // fallback: use onLogin prop (legacy)
    if (typeof onLogin === "function") {
      setLocalLoading(true);
      try {
        const res = onLogin({ username, password });
        if (res && typeof res.then === "function") {
          await res;
        }
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || String(err);
        setError(msg);
      } finally {
        setLocalLoading(false);
      }
      return;
    }

    // no auth handler available
    setError("No login handler available.");
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center vh-100 bg-light"
    >
      <Row className="w-100">
        <Col xs={10} sm={8} md={6} lg={4} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body>
              <h4 className="text-center mb-4">Login</h4>

              {error && (
                <Alert
                  variant="danger"
                  onClose={() => setError(null)}
                  dismissible
                >
                  {error}
                </Alert>
              )}

              <Form
                onSubmit={handleSubmit}
                autoComplete="on"
                aria-label="Login form"
              >
                <Form.Group className="mb-3" controlId="loginUsername">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    placeholder="Enter username"
                    required
                    autoFocus
                    autoComplete="username"
                    aria-label="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="loginPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                    aria-label="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Memproses...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
