const express = require("express");
const client = require("prom-client");

const app = express();

const PORT = Number(process.env.PORT || 3001);

const registry = new client.Registry();

client.collectDefaultMetrics({
    register: registry
});

const httpRequests = new client.Counter({
    name: "shopsphere_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: [
        "service",
        "method",
        "route",
        "status"
    ]
});

registry.registerMetric(httpRequests);

const products = [
    {
        id: 1,
        name: "Laptop Pro",
        price: 999.99,
        stock: 25
    },
    {
        id: 2,
        name: "Wireless Headphones",
        price: 149.99,
        stock: 80
    },
    {
        id: 3,
        name: "Mechanical Keyboard",
        price: 89.99,
        stock: 60
    }
];

app.use((req, res, next) => {

    res.on("finish", () => {

        httpRequests.inc({
            service: "product-service",
            method: req.method,
            route: req.route?.path || req.path,
            status: String(res.statusCode)
        });

    });

    next();
});


app.get("/health", (req, res) => {

    res.json({
        status: "UP",
        service: "product-service"
    });

});


app.get("/ready", (req, res) => {

    res.json({
        status: "READY",
        service: "product-service"
    });

});


app.get("/api/products", (req, res) => {

    res.json(products);

});


app.get("/api/products/:id", (req, res) => {

    const productId = Number(req.params.id);

    const product = products.find(
        item => item.id === productId
    );

    if (!product) {

        return res.status(404).json({
            error: "Product not found"
        });

    }

    res.json(product);

});


app.get("/metrics", async (req, res) => {

    res.set(
        "Content-Type",
        registry.contentType
    );

    res.end(
        await registry.metrics()
    );

});


app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `product-service listening on ${PORT}`
    );

});
