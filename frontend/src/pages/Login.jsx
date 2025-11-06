import { Container, Row, Col, Form, Button, Card } from "react-bootstrap";

function Login({ onLogin }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
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
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter username"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter password"
                    required
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button type="submit" variant="primary">
                    Login
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
