const express = require("express");
const client = require("prom-client");

const app = express();

const PORT = Number(process.env.PORT || 3003);

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


const users = [
    {
        id: 1,
        name: "Tamil",
        email: "tamil@example.local"
    },
    {
        id: 2,
        name: "Demo User",
        email: "demo@example.local"
    }
];


app.use((req, res, next) => {

    res.on("finish", () => {

        httpRequests.inc({
            service: "user-service",
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
        service: "user-service"
    });

});


app.get("/ready", (req, res) => {

    res.json({
        status: "READY",
        service: "user-service"
    });

});


app.get("/api/users", (req, res) => {

    res.json(users);

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
        `user-service listening on ${PORT}`
    );

});
