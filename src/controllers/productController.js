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

  async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { disponible } = req.body;

      if (typeof disponible !== 'boolean') {
        return res.status(400).json({
          status: 'fail',
          message: 'El campo "disponible" es obligatorio y debe ser booleano.',
        });
      }

      const productoActualizado = await productService.updateStock(id, disponible);

      res.status(200).json({
        status: 'success',
        data: { producto: productoActualizado },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();