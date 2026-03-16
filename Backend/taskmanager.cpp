#include "taskmanager.h"
#include <fstream>
#include <sstream>
#include <algorithm>

TaskManager::TaskManager() {
    loadFromFile();
}

void TaskManager::loadFromFile() {
    std::ifstream file(FILE_PATH);
    if (!file.is_open()) return;

    tasks.clear();
    nextId = 1;

    std::string line;
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        // Format: id|completed|priority|dueDate|description
        std::istringstream iss(line);
        std::string token;
        std::vector<std::string> parts;
        while (std::getline(iss, token, '|')) {
            parts.push_back(token);
        }
        if (parts.size() < 5) continue;

        Task t;
        t.id          = std::stoi(parts[0]);
        t.completed   = (parts[1] == "1");
        t.priority    = parts[2];
        t.dueDate     = parts[3];
        // description may contain '|' so join remaining parts
        t.description = parts[4];
        for (size_t i = 5; i < parts.size(); i++) t.description += "|" + parts[i];

        tasks.push_back(t);
        if (t.id >= nextId) nextId = t.id + 1;
    }
    file.close();
}

void TaskManager::saveToFile() {
    std::ofstream file(FILE_PATH);
    for (const auto& t : tasks) {
        file << t.id << "|"
             << (t.completed ? "1" : "0") << "|"
             << t.priority << "|"
             << t.dueDate  << "|"
             << t.description << "\n";
    }
    file.close();
}

void TaskManager::addTask(const std::string& desc, const std::string& priority, const std::string& dueDate) {
    if (desc.empty()) return;
    Task t;
    t.id          = nextId++;
    t.description = desc;
    t.completed   = false;
    t.priority    = priority.empty() ? "low" : priority;
    t.dueDate     = dueDate;
    tasks.push_back(t);
    saveToFile();
}

void TaskManager::updateTask(int id, const std::string& priority, const std::string& dueDate) {
    for (auto& t : tasks) {
        if (t.id == id) {
            if (!priority.empty()) t.priority = priority;
            t.dueDate = dueDate; // allow clearing date with empty string
            break;
        }
    }
    saveToFile();
}

void TaskManager::completeTask(int id) {
    for (auto& t : tasks) {
        if (t.id == id) { t.completed = !t.completed; break; }
    }
    saveToFile();
}

void TaskManager::deleteTask(int id) {
    tasks.erase(
        std::remove_if(tasks.begin(), tasks.end(),
            [id](const Task& t){ return t.id == id; }),
        tasks.end());
    saveToFile();
}

std::vector<Task> TaskManager::getTasks() { return tasks; }

static std::string jsonEscape(const std::string& s) {
    std::string out;
    for (char c : s) {
        if      (c == '"')  out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else                out += c;
    }
    return out;
}

std::string TaskManager::toJSON() {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < tasks.size(); i++) {
        if (i > 0) oss << ",";
        oss << "{"
            << "\"id\":"          << tasks[i].id                          << ","
            << "\"description\":\"" << jsonEscape(tasks[i].description)   << "\","
            << "\"completed\":"   << (tasks[i].completed ? "true":"false") << ","
            << "\"priority\":\""  << jsonEscape(tasks[i].priority)        << "\","
            << "\"dueDate\":\""   << jsonEscape(tasks[i].dueDate)         << "\""
            << "}";
    }
    oss << "]";
    return oss.str();
}
