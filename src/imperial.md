---
layout: base
title: Documentation
description: 
---

## Imperial Service

... (To be written)

### Serial packet format

| Byte   | Purpose                         |
| ------ | ------------------------------- |
| 1-8    | Header will equal `IMPERIAL`    |
| 9      | Type (see below)                |
| 10     | Length                          |
| 11...X | Data                            |
| X + 11 | Checksum (Not for RPC/Response) |


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


### RPC Result (_Device to client_)

RCP response type: `0x04`

This message type contains the response to a RPC command. Results are returned as a list of strings. An empty list is allowed.

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
