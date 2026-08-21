// src/services/productService.js
const productRepository = require('../repositories/productRepository');

class ProductService {
  async getMenuByLocal(localId) {
    if (!localId) {
      throw new Error('El ID del local es obligatorio');
    }
    return await productRepository.findByLocalId(localId);
  }

  async createProduct(productData) {
    if (!productData.nombre || !productData.precio) {
      throw new Error('El nombre y el precio del producto son obligatorios');
    }
    return await productRepository.create(productData);
  }
}

module.exports = new ProductService();