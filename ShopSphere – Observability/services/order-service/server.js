const express = require("express");
const client = require("prom-client");

const app = express();

app.use(express.json());

const PORT = Number(process.env.PORT || 3002);

const PRODUCT_SERVICE_URL =
    process.env.PRODUCT_SERVICE_URL ||
    "http://product-service:3001";


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


let nextOrderId = 1;

const orders = [];


app.use((req, res, next) => {

    res.on("finish", () => {

        httpRequests.inc({
            service: "order-service",
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
        service: "order-service"
    });

});


app.get("/ready", (req, res) => {

    res.json({
        status: "READY",
        service: "order-service"
    });

});


app.get("/api/orders", (req, res) => {

    res.json(orders);

});


app.post("/api/orders", async (req, res) => {

    try {

        const {
            userId,
            productId,
            quantity = 1
        } = req.body || {};


        if (
            !userId ||
            !productId ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {

            return res.status(400).json({
                error:
                    "userId, productId and positive integer quantity are required"
            });

        }


        const productResponse =
            await fetch(
                `${PRODUCT_SERVICE_URL}/api/products/${productId}`
            );


        if (!productResponse.ok) {

            return res.status(404).json({
                error: "Product not found"
            });

        }


        const product =
            await productResponse.json();


        if (product.stock < quantity) {

            return res.status(409).json({
                error: "Insufficient stock"
            });

        }


        const order = {

            id: nextOrderId++,

            userId,

            productId,

            quantity,

            total:
                Number(
                    (
                        product.price * quantity
                    ).toFixed(2)
                ),

            status: "CREATED"
        };


        orders.push(order);


        res.status(201).json(order);

    } catch (error) {

        console.error(
            "Product service request failed:",
            error
        );

        res.status(503).json({
            error: "Product service unavailable"
        });

    }

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
        `order-service listening on ${PORT}`
    );

});
