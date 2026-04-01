export const PERMS = {
  createProduct:     () => true,
  deleteProduct:     () => true,
  archiveProduct:    () => true,
  bulkActions:       () => true,
  manageCategories:  () => true,
  editSEO:           () => true,
  exportProducts:    () => true,
  featureProduct:    () => true,
  publishProduct:    () => true,
  editVariantMatrix: () => true,
};

export const can = {
  claimOrder:    () => true,
  assignToOther: () => true,
  reassign:      () => true,
  unassign:      () => true,
  updateStatus: () => true,
  printLabel:   () => true,
};

export const customerCan = {
  viewAll:         () => true,
  exportCustomers: () => true,
  deleteCustomer:  () => true,
  banCustomer:     () => true,
};

export const discountCan = {
  createDiscount: () => true,
  deleteDiscount: () => true,
  editDiscount:   () => true,
};
