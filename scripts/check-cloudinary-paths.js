/*
  Smoke check for Cloudinary folder/public_id computation.
  Run with: node scripts/check-cloudinary-paths.js
*/

const { computeCloudinaryPaths } = require('../dist/lib/cloudinary-paths');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { folderPath, publicId } = computeCloudinaryPaths({
  categoryName: 'Healthcare Essentials',
  subcategoryName: 'Diagnostic & Monitoring Devices',
  productId: 'prod_0001',
  imageIndex: 1,
});

console.log({ folderPath, publicId });

assert(publicId === 'prod_0001_img1', 'publicId should be filename only');
assert(!publicId.includes('/'), 'publicId must not contain /');
assert(!publicId.includes('&'), 'publicId must not contain &');
assert(
  folderPath === 'ProsmartProducts/Healthcare_Essentials/Diagnostic___Monitoring_Devices/prod_0001',
  'folderPath mismatch'
);

console.log('OK');
