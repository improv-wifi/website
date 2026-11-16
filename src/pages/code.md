---
layout: ../layouts/Base.astro
title: Code
description: SDKs and code samples for Improv Wi-Fi clients and services.
---

This page contains software development kits (SDK) and code samples to help you get started using Improv Wi-Fi in your projects.

## Creating client applications to configure devices

These examples will help you create clients that can provision devices via Improv.

### Bluetooth LE SDK for JavaScript

The Bluetooth LE SDK for JavaScript contains everything you need to offer Improv provisioning using Bluetooth LE on your website. Simply get started by adding the following HTML snippet:

```html
<script
  type="module"
  src="https://unpkg.com/@improv-wifi/ble-sdk@2/dist/web/launch-button.js"
></script>

<improv-wifi-launch-button></improv-wifi-launch-button>
```

The result will look like this:

> <improv-wifi-launch-button></improv-wifi-launch-button>

See [the GitHub repository](https://github.com/improv-wifi/sdk-ble-js) for the documentation, source code, customization examples and how to use it with JavaScript package managers.

### Serial SDK for JavaScript

The Serial SDK for JavaScript contains everything you need to offer Improv provisioning using Serial on your website. Simply get started by adding the following HTML snippet:

```html
<script
  type="module"
  src="https://unpkg.com/@improv-wifi/serial-sdk@3/dist/web/serial-launch-button.js"
></script>

<improv-wifi-serial-launch-button></improv-wifi-serial-launch-button>
```

The result will look like this:

> <improv-wifi-serial-launch-button></improv-wifi-serial-launch-button>

See [the GitHub repository](https://github.com/improv-wifi/sdk-serial-js) for the documentation, source code, customization examples and how to use it with JavaScript package managers.

### Bluetooth LE SDK for Android

The Android SDK contains all state management, constants and other helpers required to provision devices via Improv.

See [the GitHub repository](https://github.com/improv-wifi/sdk-android) for the documentation, source code and demo application.

## Creating firmware hosting the Improv service

### SDK for C++

The C++ SDK contains constants and utility functions to parse the packets and help with implementing the Improv service on your device. If you need an example of using the SDK for C++, check this example [here](https://jnthas.github.io/improv-wifi-demo/).

See [the GitHub repository](https://github.com/improv-wifi/sdk-cpp) for the documentation and source code.
