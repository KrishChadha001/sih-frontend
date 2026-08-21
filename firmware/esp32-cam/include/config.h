#pragma once

#include "secrets.h"

// Unique identifier for this IV stand unit - what the backend/dashboard
// key readings against. Give each physical device a distinct ID.
#define DEVICE_ID "IV-CAM-01"

// Deployment metadata: which bed/patient/fluid this stand is currently
// assigned to. Static config, not something the camera detects - a nurse
// would set these when moving the stand to a new bed. Sent along with
// every frame so the dashboard shows a real bed card. Avoid characters
// that need URL-encoding beyond spaces (handled automatically below).
#define BED_LABEL "Bed 07"
#define PATIENT_NAME "Unassigned"
#define FLUID_LABEL "Saline 0.9%"

// How often a photo is captured and uploaded, in milliseconds. A full
// upload (capture + multipart POST + model inference round-trip) takes a
// few seconds - don't set this much below ~5s or captures start
// overlapping with slow uploads.
#define SEND_INTERVAL_MS 10000UL

// HTTP request timeout for the upload - higher than a typical JSON POST
// since it's transferring an actual image and waiting on model
// inference server-side.
#define HTTP_TIMEOUT_MS 15000

// WiFi connect timeout before retrying, in milliseconds.
#define WIFI_CONNECT_TIMEOUT_MS 15000UL

// Capture settings. FRAMESIZE_VGA (640x480) is a solid default - small,
// fast to upload, plenty of resolution for the model (which resizes to
// 224x224 anyway - see frontend/server/app/cv/real_frame_processor.py).
// Bump to FRAMESIZE_SVGA/XGA only if testing shows the model needs more
// detail; every step up meaningfully increases upload time on WiFi.
#define CAPTURE_FRAME_SIZE FRAMESIZE_VGA
#define CAPTURE_JPEG_QUALITY 12 // 0-63, lower = higher quality/larger file
