#pragma once
#include <string>
#include <vector>

struct Task {
    int id;
    std::string description;
    bool completed;
    std::string priority; // "low", "medium", "high"
    std::string dueDate;  // "YYYY-MM-DD" or empty
};

class TaskManager {
private:
    std::vector<Task> tasks;
    const std::string FILE_PATH = "tasks.txt";
    int nextId = 1;

    void loadFromFile();
    void saveToFile();

public:
    TaskManager();
    void addTask(const std::string& desc, const std::string& priority, const std::string& dueDate);
    void updateTask(int id, const std::string& priority, const std::string& dueDate);
    void completeTask(int id);
    void deleteTask(int id);
    std::vector<Task> getTasks();
    std::string toJSON();
};