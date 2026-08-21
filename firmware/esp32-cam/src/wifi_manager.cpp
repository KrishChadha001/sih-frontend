#include "wifi_manager.h"
#include "config.h"
#include <Arduino.h>
#include <WiFi.h>

namespace {
constexpr unsigned long kReconnectIntervalMs = 10000UL;
}

bool WiFiManager::begin(const char *ssid, const char *password) {
    ssid_ = ssid;
    password_ = password;

    WiFi.mode(WIFI_STA);
    Serial.printf("[WiFi] connecting to \"%s\"...\n", ssid_);
    WiFi.begin(ssid_, password_);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
        delay(300);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] connected, IP=%s\n", WiFi.localIP().toString().c_str());
        return true;
    }

    Serial.println("[WiFi] initial connect failed, will keep retrying in background");
    return false;
}

bool WiFiManager::ensureConnected() {
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    unsigned long now = millis();
    if (now - lastReconnectAttemptMs_ >= kReconnectIntervalMs) {
        lastReconnectAttemptMs_ = now;
        Serial.println("[WiFi] reconnecting...");
        WiFi.disconnect();
        WiFi.begin(ssid_, password_);
    }
    return false;
}

bool WiFiManager::isConnected() const {
    return WiFi.status() == WL_CONNECTED;
}
