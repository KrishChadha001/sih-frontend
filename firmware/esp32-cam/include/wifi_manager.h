#pragma once

class WiFiManager {
public:
    bool begin(const char *ssid, const char *password);
    bool ensureConnected(); // call every loop(); reconnects if dropped
    bool isConnected() const;

private:
    const char *ssid_ = nullptr;
    const char *password_ = nullptr;
    unsigned long lastReconnectAttemptMs_ = 0;
};
