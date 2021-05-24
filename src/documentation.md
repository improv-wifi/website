---
layout: base
title: Documentation
description: All the implementation details necessary to make your own client and service implementation.
---

The Improv Wi-Fi protocol has two actors: the Improv service running on the gadget and the Improv client.

The Improv service will broadcast its presence via Bluetooth LE and receives Wi-Fi credentials from the client.

The Improv client detects the service via Bluetooth LE and will offer the user to send Wi-Fi credentials.

## Improv Service

The Improv service runs on a gadget that needs to connect to the internet but has no credentials or is unable to establish a connection.

The Improv service can optionally require physical authorization to allow pairing, like pressing a button. It is up to the gadget to decide if and what interaction to pick. A gadget that does not require authorization should start in the "authorized" state.

If an Improv service has been authorized by a user interaction, the authorization should be automatically revoked after a timeout. This timeout is up to the gadget but we suggest 1 minute.

A user is able to send Wi-Fi credentials to an authorized service. The gadget will attempt to connect to the specified wireless network. If the connection is successful, the state changes to "provisioned", the gadget can optionally return a URL to the client to finish onboarding and the Improv service is stopped.

If the gadget is unable to connect an error is returned. If the gadget required authorization, the authorization reset timeout should start over.

![Improv State machine](/images/improv-states.svg)

The client is able to send an `identify` command to the Improv service if it is in the states "Require Authorization" and "Authorized". When received, and enabled, the gadget will identify itself, like playing a sound or flashing a light. It is up to the gadget to decide if and what interaction to pick.

## Bluetooth LE Service

Service UUID: `00467768-6228-2272-4663-277478268000`

### Characteristic: Capabilities

Characteristic UUID: `00467768-6228-2272-4663-277478268005`

This characteristic has binary encoded byte(s) of the device’s capabilities.

| Bit (LSB) | Capability                                     |
| --------- | ---------------------------------------------- |
| `0`       | 1 if the device supports the identify command. |

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
| ------ | ------------------- | --------------------------------------------------------------------------------------- |
| `0x00` | No error            | This shows there is no current error state.                                             |
| `0x01` | Invalid RPC packet  | RPC packet was malformed/invalid.                                                       |
| `0x02` | Unknown RPC command | The command sent is unknown.                                                            |
| `0x03` | Unable to connect   | The credentials have been received and an attempt to connect to the network has failed. |
| `0x04` | Not Authorized      | Credentials were sent via RPC but the Improv service is not authorized.                 |
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

