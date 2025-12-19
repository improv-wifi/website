---
layout: base
title: Improv via BLE
description: All the implementation details necessary to make your own client and service implementation.
---

This is the description of the Improv Wi-Fi protocol using Bluetooth Low Energy.

The protocol has two actors: the Improv service running on the gadget and the Improv client.

The Improv service will broadcast its presence via Bluetooth LE and receives Wi-Fi credentials from the client.

The Improv client detects the service via Bluetooth LE and will offer the user to send Wi-Fi credentials.

## Improv Service

The Improv service runs on a gadget that needs to connect to the internet but has no credentials or is unable to establish a connection.

The Improv service can optionally require physical authorization to allow pairing, like pressing a button. It is up to the gadget to decide if and what interaction to pick. A gadget that does not require authorization should start in the "authorized" state.

If an Improv service has been authorized by a user interaction, the authorization should be automatically revoked after a timeout. This timeout is up to the gadget but we suggest 1 minute.

A user is able to send Wi-Fi credentials to an authorized service. The gadget will attempt to connect to the specified wireless network. If the connection is successful, the state changes to "provisioned", the gadget can optionally return a URL to the client to finish onboarding and the Improv service is stopped.

If the gadget is unable to connect an error is returned. If the gadget required authorization, the authorization reset timeout should start over.

![Improv State machine](/images/improv-states.svg)

The client is able to send an `identify` to the Improv service if it is in the states "Require Authorization" and "Authorized". When received, and enabled, the gadget will identify itself, like playing a sound or flashing a light. It is up to the gadget to decide if and what interaction to pick.

The client is able to send a `device info` to the Improv service if it is in the states "Require Authorization" and "Authorized". When received, and supported, the gadget will return the device information in the RPC response characteristic.

All strings must be encoded as either 7-bit ASCII or UTF-8.

## Revision history

- 1.0 - Initial release
- 2.0 - Added Service Data `4677`
- 2.1 - Added Device Info RPC command
- 2.2 - Added Scan Wifi RPC command
- 2.3 - Added Hostname RPC command
- 2.4 - Added Device Name RPC command

## GATT Services

### Characteristic: Capabilities

Characteristic UUID: `00467768-6228-2272-4663-277478268005`

This characteristic has binary encoded byte(s) of the device’s capabilities.

| Bit (LSB) | Capability                                        |
|-----------|---------------------------------------------------|
| `0`       | 1 if the device supports the identify command.    |
| `1`       | 1 if the device supports the device info command. |
| `2`       | 1 if the device supports the scan wifi command.   |
| `3`       | 1 if the device supports the hostname command.    |


### Characteristic: Current State

Characteristic UUID: `00467768-6228-2272-4663-277478268001`

This characteristic will hold the current status of the provisioning service and will write and notify any listening clients for instant feedback.

| Value  | State                  | Purpose                                          |
| ------ | ---------------------- | ------------------------------------------------ |
| `0x01` | Authorization Required | Awaiting authorization via physical interaction. |
| `0x02` | Authorized             | Ready to accept credentials.                     |
| `0x03` | Provisioning           | Credentials received, attempt to connect.        |
| `0x04` | Provisioned            | Connection successful.                           |

### Characteristic: Error state

Characteristic UUID: `00467768-6228-2272-4663-277478268002`

This characteristic will hold the current error of the provisioning service and will write and notify any listening clients for instant feedback.

| Value  | State               | Purpose                                                                                 |
|--------|---------------------|-----------------------------------------------------------------------------------------|
| `0x00` | No error            | This shows there is no current error state.                                             |
| `0x01` | Invalid RPC packet  | RPC packet was malformed/invalid.                                                       |
| `0x02` | Unknown RPC command | The command sent is unknown.                                                            |
| `0x03` | Unable to connect   | The credentials have been received and an attempt to connect to the network has failed. |
| `0x04` | Not Authorized      | Credentials were sent via RPC but the Improv service is not authorized.                 |
| `0x05` | Bad Hostname        | The hostname provided was not valid or acceptable by the device.                        |
| `0xFF` | Unknown Error       |

### Characteristic: RPC Command

Characteristic UUID: `00467768-6228-2272-4663-277478268003`

This characteristic is where the client can write data to call the RPC service.

Note: if the combined payload is over 20 bytes, it will require multiple BLE packets to transfer the data. Make sure that your code deals with this.

| Byte  | Description                                           |
| ----- | ----------------------------------------------------- |
| 1     | Command (see below)                                   |
| 2     | Data length                                           |
| 3...X | Data                                                  |
| X + 3 | Checksum - A simple sum checksum keeping only the LSB |

#### RPC Command: Send Wi-Fi settings

Submit Wi-Fi credentials to the Improv Service to attempt to connect to.

Requires the Improv service to be authorized.

Command ID: `0x01`

| Byte | Description     |
| ---- | --------------- |
| 01   | command         |
| xx   | data length     |
| yy   | ssid length     |
|      | ssid bytes      |
| zz   | password length |
|      | password bytes  |
| CS   | checksum        |

Example: SSID = MyWirelessAP, Password = mysecurepassword

```
01 1E 0C {MyWirelessAP} 10 {mysecurepassword} CS
```

This command will generate an RPC result. The first entry in the list is an URL to redirect the user to. If there is no URL, omit the entry or add an empty string.

#### RPC Command: Identify

What a device actually does when an identify command is received is up to that specific device, but the user should be able to visually or audibly identify the device.

Command ID: `0x02`

Does not require the Improv service to be authorized.

Should only be sent if the capability characteristic indicates that identify is supported.

| Byte | Description            |
| ---- | ---------------------- |
| 02   | command                |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

This command has no RPC result.

#### RPC Command: Device Info

Sends a request for the device to send information about itself.

Command ID: `0x03`

Does not require the Improv service to be authorized.

Should only be sent if the capability characteristic indicates that device info is supported.

| Byte | Description            |
|------|------------------------|
| 03   | command (`0x03`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

This command will generate an RPC result. There will be at least 4 entries in the list response.

Order of strings: Firmware name, firmware version, hardware chip/variant, device name.

Example: `ESPHome`, `2021.11.0`, `ESP32-C3`, `Temperature Monitor`.

### RPC Command: Request scanned Wi-Fi networks

Sends a request for the device to send the Wi-Fi networks it sees.

Command ID: `0x04`

| Byte | Description            |
|------|------------------------|
| 04   | command (`0x04`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

This command will trigger one RPC Response which will contain a multiple of 3 strings where the first contains the SSID,
the second the RSSI and the third the authentication type of either WEP, WPA, WPA2 or NO.

Order of strings: Wi-Fi SSID 1, RSSI 1, Auth type 1, Wi-Fi SSID 2, RSSI 2, Auth type 2, ...

Example: `MyWirelessNetwork`, `-60`, `WPA2`, `MyOtherWirelessNetwork`, `-52`, `WEP`,...

A response with no strings means no SSID was found.

### RPC Command: Get/Set Hostname

Sends a request for the device to either get or set its hostname.
This operation is only available while the device is Authorized.  Sending the command with no data will return
the current hostname in the response. Sending the command with data will set the hostname to the data and also
return the updated hostname in the response.

Hostnames must conform to [RFC 1123](https://datatracker.ietf.org/doc/html/rfc1123) and can contain only letters,
numbers and hyphens with a length of up to 255 characters.  Error code `0x05` will be returned if the hostname provided is not acceptable.

Command ID: `0x05`

Get Hostname:

| Byte | Description            |
|------|------------------------|
| 05   | command (`0x05`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

Set Hostname:

| Byte | Description        |
|------|--------------------|
| 05   | command (`0x05`)   |
| XX   | length of hostname |
|      | bytes of hostname  |
| CS   | checksum           |

This command will trigger one RPC Response which will contain the hostname of the device. Getting or setting this
property should reset the authorization timeout.

### RPC Command: Get/Set Device Name

Sends a request for the device to either get or set its name. This could mean different things depending on the device
manufacturer.  It may alter the default "hostname" or not. If setting both this property and hostname, it is recommended
to set hostname first then device name. Getting this property should return the same value as the Device Info's 
"Device Name" (4th) property.

Command ID: `0x06`

Get Device Name:

| Byte | Description            |
|------|------------------------|
| 06   | command (`0x06`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

Set Device Name:

| Byte | Description                    |
|-----|--------------------------------|
| 06  | command (`0x06`)               |
| XX  | length of device name in bytes |
|     | bytes of device name           |
| CS  | checksum                       |

This command will trigger one RPC Response which will contain the Device Name of the device. Getting or setting this
property should reset the authorization timeout.


### Characteristic: RPC Result

Characteristic UUID: `00467768-6228-2272-4663-277478268004`

This characteristic is where the client can read results from the RPC service if it has a result. Results are returned as a list of strings. An empty list is allowed.

| Byte      | Description                                           |
| --------- | ----------------------------------------------------- |
| 1         | Command (see below)                                   |
| 2         | Data length                                           |
| 3         | Length of string 1                                    |
| 4...X     | String 1                                              |
| X         | Length of string 2                                    |
| X...Y     | String 2                                              |
| ...       | etc                                                   |
| last byte | Checksum - A simple sum checksum keeping only the LSB |

## Bluetooth LE Advertisement

The device MUST advertise the Service UUID.

Service UUID: `00467768-6228-2272-4663-277478268000`

With version 2.1 of the specification:

- The Service Data and Service UUID MUST be advertised periodically and when the state changes.
- The Service Data and Service UUID MUST be in the same advertisement.
- The Service Data and Service UUID MUST NOT be in the scan response or require active scans.
- If the device cannot fit all of its advertising data in 31 bytes, it should cycle between advertising data.

### Service Data format

Service Data UUID: `4677` (`00004677-0000-1000-8000-00805f9b34fb`)

| Byte      | Description                                           |
| --------- | ----------------------------------------------------- |
| 1         | Current state                                         |
| 2         | Capabilities                                          |
| 3         | 0 (RESERVED)                                          |
| 4         | 0 (RESERVED)                                          |
| 5         | 0 (RESERVED)                                          |
| 6         | 0 (RESERVED)                                          |
