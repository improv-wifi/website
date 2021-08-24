---
layout: base
title: Imperial
description: 
---

## Imperial Service

Imperial is Improv via Serial and allows a client to send the Wi-Fi credentials to a device to save via a serial connection.

### Serial packet format

| Byte   | Purpose                         |
| ------ | ------------------------------- |
| 1-8    | Header will equal `IMPERIAL`    |
| 9      | Version   CURRENT VERSION = `1` |
| 10     | Type (see below)                |
| 11     | Length                          |
| 12...X | Data                            |
| X + 12 | Checksum (Not for RPC/Response) |


### Current State (_Device to client_)

Current state type: `0x01`

The current status of the provisioning service and will write and notify any listening clients for instant feedback.

| Value  | State                  | Purpose                                          |
| ------ | ---------------------- | ------------------------------------------------ |
| `0x02` | Ready (Authorized)     | Ready to accept credentials.                     |
| `0x03` | Provisioning           | Credentials received, attempt to connect.        |
| `0x04` | Provisioned            | Connection successful.                           |

### Error state (_Device to client_)

Error state type: `0x02`

This message will be sent with the current error state if it changes for instant feedback.

| Value  | State               | Purpose                                                                                 |
| ------ | ------------------- | --------------------------------------------------------------------------------------- |
| `0x00` | No error            | This shows there is no current error state.                                             |
| `0x01` | Invalid RPC packet  | RPC packet was malformed/invalid.                                                       |
| `0x02` | Unknown RPC command | The command sent is unknown.                                                            |
| `0x03` | Unable to connect   | The credentials have been received and an attempt to connect to the network has failed. |
| `0xFF` | Unknown Error       |                                                                                         |

### RPC (_Client to device_)

RPC type: `0x03`

This message type is used for the client to send commands to the device.

| Byte  | Description                                           |
| ----- | ----------------------------------------------------- |
| 1     | Command (see below)                                   |
| 2     | Data length                                           |
| 3...X | Data                                                  |
| X + 3 | Checksum - A simple sum checksum keeping only the LSB |

#### RPC Command: Send Wi-Fi settings

Submit Wi-Fi credentials to the Improv Service to attempt to connect to.

Command ID: `0x01`

| Byte  | Description      |
| ----- | ---------------- |
| 1     | command (`0x01`) |
| 2     | data length      |
| 3     | ssid length      |
| 4...X | ssid bytes       |
| X     | password length  |
| X...Y | password bytes   |
| Y     | checksum         |

Example: SSID = MyWirelessAP, Password = mysecurepassword

```
01 1E 0C {MyWirelessAP} 10 {mysecurepassword} CS
```

This command will generate an RPC result. The first entry in the list is an URL to redirect the user to. If there is no URL, omit the entry or add an empty string.

#### RPC Command: Request current state

Sends a request for the device to send the current state of imperial to the client.

Command ID: `0x02`

| Byte | Description      |
| ---- | ---------------- |
| 1    | command (`0x02`) |

This command will trigger at least one packet, the `Current State` (see above) and  if already provisioned, the same response you would get if device provisioning was successful (see below).


### RPC Result (_Device to client_)

RCP response type: `0x04`

This message type contains the response to a RPC command. Results are returned as a list of strings. An empty list is allowed.

| Byte      | Description                                           |
| --------- | ----------------------------------------------------- |
| 1         | Command being responded to (see above)                |
| 2         | Data length                                           |
| 3         | Length of string 1                                    |
| 4...X     | String 1                                              |
| X         | Length of string 2                                    |
| X...Y     | String 2                                              |
| ...       | etc                                                   |
| last byte | Checksum - A simple sum checksum keeping only the LSB |
