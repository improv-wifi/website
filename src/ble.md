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

As an alternative or in addition to physical authorization, a gadget can be authorized with a setup code printed on the gadget or its packaging, similar to the setup code used by Matter. The client proves knowledge of the setup code with a password-authenticated key exchange, which also establishes an encrypted session so the Wi-Fi credentials are never sent in the clear. See the section "Setup Code Authentication" below.

A user is able to send Wi-Fi credentials to an authorized service. The gadget will attempt to connect to the specified wireless network. If the connection is successful, the state changes to "provisioned", the gadget can optionally return a URL to the client to finish onboarding and the Improv service is stopped.

If the gadget is unable to connect an error is returned. If the gadget required authorization, the authorization reset timeout should start over.

![Improv State machine](/images/improv-states.svg)

The client is able to send an `identify` to the Improv service if it is in the states "Require Authorization" and "Authorized". When received, and enabled, the gadget will identify itself, like playing a sound or flashing a light. It is up to the gadget to decide if and what interaction to pick.

The client is able to send a `device info` to the Improv service if it is in the states "Require Authorization" and "Authorized". When received, and supported, the gadget will return the device information in the RPC response characteristic.

All strings are assumed to be UTF-8 encoded.

## Revision history

- 1.0 - Initial release
- 2.0 - Added Service Data `4677`
- 2.1 - Added Device Info RPC command
- 2.2 - Added Scan Wifi RPC command
- 2.3 - Added Hostname RPC command
- 2.4 - Added Device Name RPC command
- 2.5 - Added Setup Code Authentication (SPAKE2+) and Encrypted RPC command

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
| `4`       | 1 if the device supports setup code authentication. |


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
| `0x06` | Authentication Failed | The setup code could not be verified, a setup code command was received out of order, or an encrypted packet could not be decrypted. The secure session, if any, is terminated. |
| `0x07` | Too Many Attempts   | Too many failed setup code authentication attempts. The device temporarily refuses new attempts; the client should retry later. |
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

Order of strings: Firmware name, firmware version, hardware chip/variant, device name. Optionally, the OS name and OS
version can be appended if applicable and different from the firmware name/version.

Example without OS Name: `ESPHome`, `2021.11.0`, `esp32-s3-devkitc-1/esp32-s3`, `Temperature Monitor`.

Example with OS Name: `Bluetooth Proxy`, `v1.0.0`, `denky_d4/esp32`, `My Bluetooth Proxy`, `ESPHome`, `2025.12.2`.

### RPC Command: Request scanned Wi-Fi networks

Sends a request for the device to send the Wi-Fi networks it sees.

Command ID: `0x04`

| Byte | Description            |
|------|------------------------|
| 04   | command (`0x04`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

This command will trigger one RPC Response which will contain a multiple of 3 strings where the first contains the SSID,
the second the RSSI and the third the authentication type of either WEP, WPA, WPA2, WPA2 EAP, WPA3, WAPI or NO. If 
multiple authentication types are supported they should be separated by a forward slash `/`.

Order of strings: Wi-Fi SSID 1, RSSI 1, Auth type 1, Wi-Fi SSID 2, RSSI 2, Auth type 2, ...

Example: `MyWirelessNetwork`, `-60`, `WPA2`, `MyOtherWirelessNetwork`, `-52`, `WPA/WPA2`,...

A response with no strings means no SSID was found.

### RPC Command: Get/Set Hostname

Sends a request for the device to either get or set its hostname.
This operation is only available while the device is Authorized.  Sending the command with no data will return
the current hostname in the response. Sending the command with data will set the hostname to the data and also
return the updated hostname in the response. Setting this property requires the device to be in an 'Authorized' state.

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

This command will trigger one RPC Response which will contain the hostname of the device. Setting this
property should reset the authorization timeout.

### RPC Command: Get/Set Device Name

Sends a request for the device to either get or set its name. This could mean different things depending on the device
manufacturer.  It may alter the default "hostname" or not. If setting both this property and hostname, it is recommended
to set the device name first then the hostname. Getting this property should return the same value as the Device Info's 
"Device Name" (4th) property. Setting this property requires the device to be in an 'Authorized' state.

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

This command will trigger one RPC Response which will contain the Device Name of the device. Setting this
property should reset the authorization timeout.


### RPC Command: Begin Setup Code Authentication

Starts a setup code authentication handshake and returns the parameters the client needs to derive the
SPAKE2+ values from the setup code. See the section "Setup Code Authentication" below for the
cryptographic details.

Command ID: `0x08`

Accepted in the states "Authorization Required" and "Authorized". Should only be sent if the capability
characteristic indicates that setup code authentication is supported. Command ID `0x07` is not used by
Improv via BLE; it is reserved for the Get Network State command of Improv via Serial.

| Byte | Description            |
|------|------------------------|
| 08   | command (`0x08`)       |
| 00   | 0 data bytes / no data |
| CS   | checksum               |

This command will trigger one RPC Response with exactly 2 binary entries.

Order of entries: PBKDF2 salt (16 to 32 bytes), PBKDF2 iteration count (4 bytes, unsigned little-endian).

Receiving this command aborts any handshake or secure session that is in progress.

### RPC Command: Setup Code Authentication Share

Sends the client's SPAKE2+ share `shareP` to the device.

Command ID: `0x09`

Must be sent after Begin Setup Code Authentication. Sending it at any other time results in error `0x06`.

| Byte | Description                                     |
|------|-------------------------------------------------|
| 09   | command (`0x09`)                                |
| 41   | data length (65)                                |
|      | `shareP`, uncompressed P-256 point (65 bytes)   |
| CS   | checksum                                        |

This command will trigger one RPC Response with exactly 2 binary entries.

Order of entries: the device's share `shareV` (65 bytes, uncompressed P-256 point), the device's
confirmation `confirmV` (32 bytes).

The device counts an authentication attempt as soon as it responds to this command. The attempt is
cleared again when the handshake completes successfully.

### RPC Command: Setup Code Authentication Confirm

Sends the client's confirmation `confirmP` to the device to complete the handshake.

Command ID: `0x0A`

Must be sent after Setup Code Authentication Share. Sending it at any other time results in error `0x06`.

| Byte | Description                 |
|------|-----------------------------|
| 0A   | command (`0x0A`)            |
| 20   | data length (32)            |
|      | `confirmP` (32 bytes)       |
| CS   | checksum                    |

If `confirmP` is valid the device establishes the secure session, changes the current state to
"Authorized" and triggers one RPC Response with 0 entries. If `confirmP` is invalid the device sets
error `0x06`, discards the handshake and does not change its state.

### RPC Command: Encrypted RPC

Carries another RPC command inside the secure session established by setup code authentication.

Command ID: `0x0B`

Requires a secure session. Sending it without one results in error `0x06`.

| Byte | Description                                        |
|------|----------------------------------------------------|
| 0B   | command (`0x0B`)                                   |
| xx   | data length                                        |
|      | message counter (4 bytes, unsigned little-endian)  |
|      | ciphertext                                         |
|      | authentication tag (16 bytes)                      |
| CS   | checksum                                           |

The plaintext is an RPC command without header and checksum: the command byte, the data length byte and
the data bytes, exactly as they would appear in bytes 1 to X of a plaintext RPC command. Any command
except `0x08` to `0x0B` can be carried. Because the data length is a single byte, the plaintext is at
most 235 bytes long.

Example: the plaintext for Send Wi-Fi settings with SSID = MyWirelessAP and Password = mysecurepassword is

```
01 1E 0C {MyWirelessAP} 10 {mysecurepassword}
```

If the inner command generates an RPC result, the device answers with one RPC Response for command `0x0B`
containing exactly 1 binary entry: the message counter (4 bytes, unsigned little-endian) followed by the
ciphertext and the authentication tag (16 bytes). The plaintext is the inner RPC result without header and
checksum: the inner command byte, the data length byte and the list of strings, exactly as they would
appear in bytes 1 to X of a plaintext RPC result. If the inner command has no RPC result, the Encrypted
RPC command has no RPC result either.

Errors caused by the inner command are reported through the Error state characteristic as usual. If the
device is unable to decrypt or authenticate the packet, or the message counter is not greater than the
last counter received, the device sets error `0x06` and terminates the secure session.

Authorization obtained through setup code authentication only applies to commands carried by the Encrypted
RPC command of that secure session. A plaintext command that requires authorization is rejected with error
`0x04` unless the device has also been authorized by other means, such as a physical interaction. Commands
carried by the Encrypted RPC command reset the authorization timeout in the same way as their plaintext
counterparts.

### Characteristic: RPC Result

Characteristic UUID: `00467768-6228-2272-4663-277478268004`

This characteristic is where the client can read results from the RPC service if it has a result. Results are returned as a list of strings. An empty list is allowed.

The entries in the results of the setup code authentication commands (`0x08` to `0x0A`) and the Encrypted RPC command (`0x0B`) are binary data and not UTF-8 strings.

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

## Setup Code Authentication

Setup code authentication lets a client become authorized by proving that it knows a code that is printed
on the gadget or its packaging, or shown on its display. It follows the approach used by Matter: the code
is never sent over the air, the device only stores a verifier derived from the code, and the handshake
results in an encrypted session. A device indicates support with bit `4` of the Capabilities
characteristic. Devices that only support physical authorization are not affected by this section.

### Setup code

The setup code is a decimal number between `00000001` and `99999998`, presented to the user as 8 digits
including leading zeros. We suggest grouping the digits as `XXXX-XXXX`. The following codes MUST NOT be
used: `00000000`, `11111111`, `22222222`, `33333333`, `44444444`, `55555555`, `66666666`, `77777777`,
`88888888`, `99999999`, `12345678` and `87654321`. This matches the passcode rules of Matter.

The setup code MUST be unique per device and MUST be generated randomly at manufacturing time or by the
device itself. It MUST NOT be derived from public information such as the serial number or MAC address.

A device MAY also present the setup code as a QR code. The QR code contains the text `IMPROV:` followed by
the 8 digits, for example `IMPROV:20202021`. Additional fields MAY be appended, each separated by a
colon; clients MUST ignore fields they do not understand.

### Cryptography

The handshake is SPAKE2+ as specified in [RFC 9383](https://www.rfc-editor.org/rfc/rfc9383) with the
cipher suite P-256, SHA-256, HKDF-SHA-256 and HMAC-SHA-256. The client acts as the prover, the device as
the verifier. `idProver` and `idVerifier` are empty. `M` and `N` are the P-256 constants defined in RFC
9383:

```
M = 02886e2f97ace46e55ba9dd7242579f2993b64e16ef3dcab95afd497333d8fa12f
N = 03d8bbd6c639c62937b04d997f38c3770719c629d7014d49a24b4f98baa1292b49
```

Points are exchanged and used in the transcript in uncompressed SEC1 encoding (65 bytes, starting with
`0x04`). Scalars are encoded as 32-byte big-endian integers. All other multi-byte integers in this
section are unsigned little-endian.

#### Verifier

The verifier is derived from the setup code the same way as in Matter, so a device that already has a
Matter SPAKE2+ verifier can reuse it together with its setup code:

```
w0s || w1s = PBKDF2-HMAC-SHA256(password = setup code as 4-byte little-endian integer,
                                salt, iterations, output length = 80 bytes)
w0 = w0s mod n
w1 = w1s mod n
L  = w1 * G
```

`w0s` is the first 40 bytes and `w1s` the second 40 bytes of the PBKDF2 output. Each is interpreted as an
unsigned big-endian integer and reduced modulo `n`, the order of the P-256 group. `G` is the P-256
generator. The resulting `w0` and `w1` are 32-byte big-endian scalars. The device stores `salt`,
`iterations`, `w0` and `L`; `w0 || L` is the 97-byte verifier in the same format as a Matter SPAKE2+
verifier. The device does not need to store the setup code or `w1`. The salt MUST be 16 to 32 random
bytes and the iteration count MUST be between 1000 and 100000, both chosen when the verifier is generated.

#### Handshake

1. The client sends Begin Setup Code Authentication (`0x08`). The device responds with `salt` and
   `iterations`.
2. The client computes `w0` and `w1` from the setup code entered by the user, picks a random scalar `x`
   and sends `shareP = x * G + w0 * M` with Setup Code Authentication Share (`0x09`).
3. The device picks a random scalar `y` and computes `shareV = y * G + w0 * N`,
   `Z = y * (shareP - w0 * M)` and `V = y * L`. It derives the keys as described below and responds with
   `shareV` and `confirmV`.
4. The client computes `Z = x * (shareV - w0 * N)` and `V = w1 * (shareV - w0 * N)`, derives the keys,
   verifies `confirmV` and sends `confirmP` with Setup Code Authentication Confirm (`0x0A`). If
   `confirmV` does not verify, the client MUST abort.
5. The device verifies `confirmP`. On success the secure session is established and the current state
   changes to "Authorized".

Both sides MUST verify that the received share is a valid point on P-256 and not the point at infinity.

#### Key derivation

```
Context    = SHA-256("Improv Wi-Fi PAKE v1" || salt || iterations)
TT         = len(Context) || Context || len(idProver) || idProver || len(idVerifier) || idVerifier
             || len(M) || M || len(N) || N || len(shareP) || shareP || len(shareV) || shareV
             || len(Z) || Z || len(V) || V || len(w0) || w0
K_main     = SHA-256(TT)
K_confirmP || K_confirmV = HKDF-SHA-256(salt = empty, ikm = K_main, info = "ConfirmationKeys", 64 bytes)
K_shared   = HKDF-SHA-256(salt = empty, ikm = K_main, info = "SharedKey", 32 bytes)
confirmP   = HMAC-SHA-256(K_confirmP, shareV)
confirmV   = HMAC-SHA-256(K_confirmV, shareP)
```

The string `"Improv Wi-Fi PAKE v1"` is UTF-8 encoded without a terminating zero, `iterations` is encoded as
4 bytes little-endian, `len()` is an 8-byte little-endian length as in RFC 9383, `idProver` and
`idVerifier` are empty (length 0), `M`, `N`, `shareP`, `shareV`, `Z` and `V` are uncompressed points and
`w0` is a 32-byte scalar. `K_confirmP` and `K_confirmV` are the first and second 32 bytes of the 64-byte
HKDF output.

The session keys are taken from `K_shared`: bytes 0 to 15 are the client-to-device key and bytes 16 to 31
are the device-to-client key.

### Encrypted session

Packets carried by the Encrypted RPC command are protected with AES-128-GCM using the key for the
respective direction and a 16-byte authentication tag. The nonce is 12 bytes: the 4-byte little-endian
message counter followed by 8 zero bytes. The additional authenticated data is 2 bytes: the Encrypted RPC
command ID `0x0B` followed by the direction, `0x00` for client to device and `0x01` for device to client.

Each direction has its own message counter. The first packet in each direction uses counter `0`, and the
counter is incremented by one for every packet sent in that direction. A receiver accepts the first packet
of a session with any counter value it can decrypt (a conforming sender uses `0`) and MUST reject every
following packet whose counter is not greater than the counter of the last accepted packet in that
direction. Counters MUST NOT wrap: a sender that has used counter `0xFFFFFFFF` MUST terminate the session
instead of sending another packet.

The secure session ends and its keys MUST be discarded when the BLE connection is closed, when the
authorization timeout expires, when a decryption or counter check fails, when a new handshake is started
or when the device is provisioned. The client needs to run the handshake again to establish a new session.

### Attempt limiting

The setup code has limited entropy, so the device MUST slow down repeated failed attempts. Every
handshake in which the device has sent its share counts as an attempt until it completes successfully;
this includes handshakes the client abandons, because the response to Setup Code Authentication Share is
enough to test one guess. A device SHOULD abort a handshake that has not completed within 30 seconds.

The device MUST NOT lock out setup code authentication permanently, because anyone in range can produce
failed attempts without knowing the code and would thereby lock out the legitimate user. Instead the
device enforces a cooldown that grows with the number of consecutive failed attempts and is cleared by a
successful handshake. While a cooldown is active, Begin Setup Code Authentication is rejected with error
`0x07`. We suggest no cooldown for the first three failed attempts, then a cooldown that starts at 5
seconds and doubles with every further failure up to a maximum of 60 seconds. At the maximum rate an
exhaustive search of the code space takes well over a century, while a user who mistyped the code waits
at most a minute. The device MAY additionally close the BLE connection after a failed attempt.

A failed attempt does not change the current state. If the device was authorized through a physical
interaction, that authorization is not affected.

### Test vector

The following vector uses the setup code, salt and iteration count of the Matter test verifier, so the
verifier can be cross-checked against a Matter implementation. `x` and `y` are fixed here and MUST be
random in a real handshake. All values are hexadecimal unless noted.

```
setup code    20202021
salt          5350414b453250204b65792053616c74            (ASCII "SPAKE2P Key Salt")
iterations    1000                                        (on the wire: e8 03 00 00)
PBKDF2 output aba60c30416b8f4177f5e16ad514cfd9577513f02fd60506b1049d0f2c7310010e5e40bf
              d86b4ef681a88b71e9e2a853985a7def916ea30e01b8722fbf7d0e38856c12cd64c225bb
              24ef21417e0e44e5
w0            b96170aae803346884724fe9a3b287c30330c2a660375d17bb205a8cf1aecb35
w1            823d264225e36f4923b43ad64f8c862a30f4a129bbf9ee8074a32d6d67586a90
L             0457f8ab79ee253ab6a8e46bb09e543ae422736de501e3db37d441fe344920d09548e4c1
              8240630c4ff4913c53513839b7c07fcc0627a1b8573a149fcd1fa466cf
verifier      uWFwqugDNGiEck/po7KHwwMwwqZgN10XuyBajPGuyzUEV/iree4lOrao5GuwnlQ65CJzbeUB
(w0 || L,     49s31EH+NEkg0JVI5MGCQGMMT/SRPFNRODm3wH/MBiehuFc6FJ/NH6Rmzw==
 base64)
x             1111111111111111111111111111111111111111111111111111111111111111
y             2222222222222222222222222222222222222222222222222222222222222222
shareP        044d0a606fb22bdb5f40f23a95bcd9b29346df87e0c4e18861366436d25d1c4e94963e02
              1b443db17551776ad40f187ffcf89628f0bd52aafed2b271bad5d36398
shareV        040beae881fcc4f61d79db4e17948af82e83c5e72b829081e18783ad61877a53b082de3b
              1eee9bfd121aa865f38d9eeb590cd54762131b3361a53cc2e7da2e9bf4
Z             04ccfc261f58193c98ca4ad4a53bbac6f0ee29bc4d48438090446908622ca79af621d4c0
              88f30a3527103b969ed229ee6372b316e85a4b348ec7c1f043c8ff7095
V             047001b126826eb09055e8c433ff178c7af3aee27e04369fac8a7e47b9a94c8e8584bebd
              b19a94d3c5b69c181ad2e7c5ccd78e920c156fffcad9294268f14ea9e2
Context       705ff60b4c7df75fdf54705e37ad04051fd56106ecf579e9b451e51dcabc2447
TT            2000000000000000 705ff60b4c7df75fdf54705e37ad04051fd56106ecf579e9b451e51dcabc2447
              0000000000000000 0000000000000000
              4100000000000000 04886e2f...2e2d20 (M, uncompressed)
              4100000000000000 04d8bbd6...6edbe7 (N, uncompressed)
              4100000000000000 shareP
              4100000000000000 shareV
              4100000000000000 Z
              4100000000000000 V
              2000000000000000 w0
K_main        afe2effe1e225c6e6d351fc985be2567035d08b156004db4e11b54f29da7b246
K_confirmP    d4b35e3eb70f0835263bda62a3e8da95dacfec4975dfcc44d05f6351545e8600
K_confirmV    a87e20a5de8e8b2448b530bb33841f2f092512f3adf2cb1eb7bee0cb3c269761
K_shared      2c1792a85a9d6559a331c8335c01fa778506cd519fcb162d26dae3c2a0b97164
confirmP      f54ad1b72b094316e3c749548fe7de4f0c226e326727c5dc7f70ec061fd9565b
confirmV      419fef16b131f42390a5cc5963f55542636d4636dc4b5651e39b7d010325253e
key c2d       2c1792a85a9d6559a331c8335c01fa77
key d2c       8506cd519fcb162d26dae3c2a0b97164
```

Complete RPC packets for this handshake, including data length and checksum bytes:

```
0x08 command   08 00 08
0x08 result    08 16 10 5350414b453250204b65792053616c74 04 e8030000 10
0x09 command   09 41 <shareP> 6c
0x09 result    09 63 41 <shareV> 20 <confirmV> f8
0x0A command   0a 20 <confirmP> ef
0x0A result    0a 00 0a
```

Encrypted RPC carrying Send Wi-Fi settings (SSID `MyWirelessAP`, password `mysecurepassword`) as the
first client packet, and the result with the URL `http://192.168.1.10` as the first device packet:

```
plaintext cmd  011e0c4d79576972656c6573734150106d7973656375726570617373776f7264
nonce          00000000 0000000000000000
AAD            0b00
0x0B command   0b 34 00000000 3e74e15b97c8434bdb335e660f01f5da0caea34630586fdb20e245e9457703365d
                        6dcbfc01c1b2fc285712a58ee227cf 02

plaintext res  011413687474703a2f2f3139322e3136382e312e3130
nonce          00000000 0000000000000000
AAD            0b01
0x0B result    0b 2b 2a 00000000 f4348f8cc0f9bce72cfe63b874e74529f099a9b5bdc64d9c2900c4cf23119100
                           c2e2a144314e e9
```

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
