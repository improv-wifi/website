---
layout: base
title: Improv via Serial
description:
---

This is the description of the Improv Wi-Fi protocol using a serial port.

The device needs to be connected to the computer via a USB/UART serial port.

The protocol has two actors: the Improv service running on the gadget and the Improv client.

The Improv service will receive Wi-Fi credentials from the client via the serial connection.

The Improv client asks for the current state and sends the Wi-Fi credentials.

## Packet format

All packets are sent in the following format:

| Byte   | Purpose                         |
| ------ | ------------------------------- |
| 1-6    | Header will equal `IMPROV`      |
| 7      | Version   CURRENT VERSION = `1` |
| 8      | Type (see below)                |
| 9      | Length                          |
| 10...X | Data                            |
| X + 10 | Checksum                        |

The packet types are:

| Type | Description | Direction
| ---- | ----------- | --------
| `0x01 ` | Current state | Device to Client
| `0x02 ` | Error state | Device to Client
| `0x03 ` | RPC Command | Client to Device
| `0x04 ` | RPC Result | Device to Client

## Packet: Current State

Type: `0x01`<br>
Direction: Device to Client

The data of this packet is a single byte and contains the current status of the provisioning service. It is to be written to any listening clients for instant feedback.

| Byte | Description      |
| ---- | ---------------- |
| 1    | current state |

The current state can be the following values:

| Value  | State                  | Purpose                                          |
| ------ | ---------------------- | ------------------------------------------------ |
| `0x02` | Ready (Authorized)     | Ready to accept credentials.                     |
| `0x03` | Provisioning           | Credentials received, attempt to connect.        |
| `0x04` | Provisioned            | Connection successful.                           |


## Packet: Error state

Type: `0x02`<br>
Direction: Device to client

The data of this packet is a single byte and contains the current status of the provisioning service. Whenever it changes the device needs to sent it to any listening clients for instant feedback.

| Byte | Description      |
| ---- | ---------------- |
| 1    | error state |

Error state can be the following values:

| Value  | State               | Purpose                                                                                 |
| ------ | ------------------- | --------------------------------------------------------------------------------------- |
| `0x00` | No error            | This shows there is no current error state.                                             |
| `0x01` | Invalid RPC packet  | RPC packet was malformed/invalid.                                                       |
| `0x02` | Unknown RPC command | The command sent is unknown.                                                            |
| `0x03` | Unable to connect   | The credentials have been received and an attempt to connect to the network has failed. |
| `0x05` | Bad Hostname        | The hostname provided was not valid or acceptable by the device.                        |
| `0xFF` | Unknown Error       |                                                                                         |

## Packet: RPC Command

Type: `0x03`<br>
Direction: Client to device

This packet type is used for the client to send commands to the device. When an RPC command is sent, the device should sent an update to the client to set the error state to 0 (no error). The response will either be an RPC result packet or an error state update.

| Byte  | Description                                           |
| ----- | ----------------------------------------------------- |
| 1     | Command (see below)                                   |
| 2     | Data length                                           |
| 3...X | Data                                                  |

### RPC Command: Send Wi-Fi settings

Submit Wi-Fi credentials to the Improv Service to attempt to connect to.

Type: `0x03`<br>
Command ID: `0x01`

| Byte  | Description      |
| ----- | ---------------- |
| 1     | command (`0x01`) |
| 2     | data length      |
| 3     | ssid length      |
| 4...X | ssid bytes       |
| X     | password length  |
| X...Y | password bytes   |

Example: SSID = MyWirelessAP, Password = mysecurepassword

```
01 1E 0C {MyWirelessAP} 10 {mysecurepassword}
```

This command will generate an RPC result. The first entry in the list is an URL to redirect the user to. If there is no URL, omit the entry or add an empty string.

### RPC Command: Request current state

Sends a request for the device to send the current state of improv to the client.

Type: `0x03`<br>
Command ID: `0x02`

| Byte | Description      |
| ---- | ---------------- |
| 1    | command (`0x02`) |
| 2    | data length (`0`)|

This command will trigger at least one packet, the `Current State` (see above) and  if already provisioned, the same response you would get if device provisioning was successful (see below).

### RPC Command: Request device information

Sends a request for the device to send information about itself.

Type: `0x03`<br>
Command ID: `0x03`

| Byte | Description      |
| ---- | ---------------- |
| 1    | command (`0x03`) |
| 2    | data length (`0`)|

This command will trigger one packet, the `Device Information` formatted as a RPC result. This result will contain at least 4 strings.

Order of strings: Firmware name, firmware version, hardware chip/variant, device name.

Example: `ESPHome`, `2021.11.0`, `ESP32-C3`, `Temperature Monitor`.

### RPC Command: Request scanned Wi-Fi networks

Sends a request for the device to send the Wi-Fi networks it sees.

Type: `0x03`<br>
Command ID: `0x04`

| Byte | Description      |
| ---- | ---------------- |
| 1    | command (`0x04`) |
| 2    | data length (`0`)|

This command will trigger at least one RPC Response. Each response will contain at least 3 strings.

Order of strings: Wi-Fi SSID, RSSI, Auth required.

Example: `MyWirelessNetwork`, `-60`, `YES`.

The final response (or the first if no networks are found) will have 0 strings in the body.

### RPC Command: Get/Set Hostname

Sends a request for the device to either get or set its hostname.
This operation is only available while the device is Authorized.  Sending the command with no data will return
the current hostname in the response. Sending the command with data will set the hostname to the data and also
return the updated hostname in the response.

Hostnames must conform to [RFC 1123](https://datatracker.ietf.org/doc/html/rfc1123) and can contain only letters,
numbers and hyphens with a length of up to 255 characters.  Error code `0x05` will be returned if the hostname provided is not acceptable.

Type: `0x03`<br>
Command ID: `0x05`

Get Hostname:

| Byte | Description            |
|------|------------------------|
| 1    | command (`0x05`)       |
| 2    | 0 data bytes / no data |

Set Hostname:

| Byte  | Description        |
|-------|--------------------|
| 1     | command (`0x05`)   |
| 2     | length of hostname |
| 3...X | bytes of hostname  |

This command will trigger one RPC Response which will contain the hostname of the device.

## Packet: RPC Result

Type: `0x04`<br>
Direction: Device to client

This packet type contains the response to an RPC command. Results are returned as a list of strings. An empty list is allowed.

| Byte      | Description                                           |
| --------- | ----------------------------------------------------- |
| 1         | Command being responded to (see above)                |
| 2         | Data length                                           |
| 3         | Length of string 1                                    |
| 4...X     | String 1                                              |
| X         | Length of string 2                                    |
| X...Y     | String 2                                              |
| ...       | etc                                                   |
