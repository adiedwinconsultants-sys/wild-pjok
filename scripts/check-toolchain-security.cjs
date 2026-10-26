const assert = require('node:assert/strict')
const { createHash, generateKeyPairSync, privateEncrypt, constants } = require('node:crypto')
const { createRequire } = require('node:module')
const { join } = require('node:path')

const mobileRequire = createRequire(join(__dirname, '../apps/mobile/package.json'))
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'))
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'))
const forge = cliRequire('node-forge')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 1024 })
const verifier = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }))
const digest = createHash('sha256').update('regression-test').digest('latin1')
const asn1 = forge.asn1

function signature({ parameters, extra }) {
  const algorithm = [
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OID,
      false,
      asn1.oidToDer(forge.oids.sha256).getBytes(),
    ),
  ]
  if (parameters) algorithm.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''))
  if (extra)
    algorithm.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, 'extra'))
  const info = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, algorithm),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest),
  ])
  return privateEncrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(asn1.toDer(info).getBytes(), 'latin1'),
  ).toString('latin1')
}

for (const parameters of [false, true]) {
  assert.equal(verifier.verify(digest, signature({ parameters, extra: false })), true)
  assert.throws(() => verifier.verify(digest, signature({ parameters, extra: true })), /DigestInfo/)
}
console.log(
  'Regresi node-forge lulus: signature valid diterima; elemen DigestAlgorithm tambahan ditolak.',
)
