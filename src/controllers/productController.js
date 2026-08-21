// src/controllers/productController.js
const productService = require('../services/productService');

class ProductController {
  async getMenuByLocal(req, res, next) {
    try {
      const { localId } = req.params;
      const productos = await productService.getMenuByLocal(localId);

      res.status(200).json({
        status: 'success',
        results: productos.length,
        data: { productos },
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const { localId } = req.params;
      const nuevoProducto = await productService.createProduct({
        ...req.body,
        localId,
      });

      res.status(201).json({
        status: 'success',
        data: { producto: nuevoProducto },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();