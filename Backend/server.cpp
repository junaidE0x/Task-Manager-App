#define _WIN32_WINNT 0x0A00
#include "httplib.h"
#include "taskmanager.h"
#include <iostream>
#include <string>
#include <sstream>

// Split a string by delimiter
static std::vector<std::string> splitStr(const std::string& s, const std::string& delim) {
    std::vector<std::string> parts;
    size_t start = 0, pos;
    while ((pos = s.find(delim, start)) != std::string::npos) {
        parts.push_back(s.substr(start, pos - start));
        start = pos + delim.size();
    }
    parts.push_back(s.substr(start));
    return parts;
}

int main() {
    TaskManager manager;
    httplib::Server server;

    auto setCORS = [](httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin",  "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
    };

    server.Options(".*", [&](const httplib::Request&, httplib::Response& res) {
        setCORS(res);
        res.status = 204;
    });

    // GET /tasks
    server.Get("/tasks", [&](const httplib::Request&, httplib::Response& res) {
        setCORS(res);
        res.set_content(manager.toJSON(), "application/json");
    });

    // POST /add  — body: "description||priority||dueDate"
    server.Post("/add", [&](const httplib::Request& req, httplib::Response& res) {
        setCORS(res);
        if (req.body.empty()) {
            res.status = 400;
            res.set_content("{\"error\":\"empty\"}", "application/json");
            return;
        }
        auto parts = splitStr(req.body, "||");
        std::string desc     = parts.size() > 0 ? parts[0] : "";
        std::string priority = parts.size() > 1 ? parts[1] : "low";
        std::string dueDate  = parts.size() > 2 ? parts[2] : "";

        if (desc.empty()) {
            res.status = 400;
            res.set_content("{\"error\":\"empty description\"}", "application/json");
            return;
        }
        manager.addTask(desc, priority, dueDate);
        res.set_content("{\"status\":\"ok\"}", "application/json");
    });

    // POST /update — body: "id||priority||dueDate"
    server.Post("/update", [&](const httplib::Request& req, httplib::Response& res) {
        setCORS(res);
        auto parts = splitStr(req.body, "||");
        if (parts.size() < 3) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid payload\"}", "application/json");
            return;
        }
        try {
            int id = std::stoi(parts[0]);
            manager.updateTask(id, parts[1], parts[2]);
            res.set_content("{\"status\":\"ok\"}", "application/json");
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid id\"}", "application/json");
        }
    });

    // POST /complete — body: task id
    server.Post("/complete", [&](const httplib::Request& req, httplib::Response& res) {
        setCORS(res);
        try {
            manager.completeTask(std::stoi(req.body));
            res.set_content("{\"status\":\"ok\"}", "application/json");
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid id\"}", "application/json");
        }
    });

    // POST /delete — body: task id
    server.Post("/delete", [&](const httplib::Request& req, httplib::Response& res) {
        setCORS(res);
        try {
            manager.deleteTask(std::stoi(req.body));
            res.set_content("{\"status\":\"ok\"}", "application/json");
        } catch (...) {
            res.status = 400;
            res.set_content("{\"error\":\"invalid id\"}", "application/json");
        }
    });

    std::cout << "TaskFlow server running at http://localhost:8080" << std::endl;
    std::cout.flush();

    bool ok = server.listen("0.0.0.0", 8080);
    if (!ok) {
        std::cerr << "ERROR: Could not start server on port 8080." << std::endl;
        std::cin.get();
        return 1;
    }
    return 0;
}