#pragma once

// Standard AI-Thinker ESP32-CAM pin mapping (OV5640/OV2640 both use this -
// the module's pin layout doesn't change with the sensor). Same mapping
// used across essentially every ESP32-CAM library/example
// (CAMERA_MODEL_AI_THINKER).

#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27

#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// Flash LED - GPIO4. Shares the SD card's data bus, so it'll flicker if
// you're also writing to an SD card. Not driven by this firmware by
// default (see main.cpp) - the IV stand doesn't need a flash for a
// normally-lit room, and it's one less thing to get wrong under time
// pressure. Uncomment the digitalWrite calls in main.cpp if low-light
// conditions need it.
#define FLASH_LED_GPIO_NUM 4
