const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const resizeImg = (req, res, next) => {
  if (!req.file) {
    next();
  } else {
    //on defini le nom du fichier et on remplace (supprime) l'extension
    const filename = req.file.filename.replace(/\.[^.]*$/, "");

    sharp(req.file.path)
      .resize(824, 1040, "contain") // On redimensionne l'image dans les proportions données par le front
      .webp({ quality: 90 }) // on change l'extension en .webp avec une qualité de 90
      .toFile(path.join("images", `resized-${filename}.webp`)) //On réécrit la nouvelle image en la renommant avec le préfixe "resized-" et l'extension .webp
      .then(() => {
        fs.unlink(req.file.path, () => {
          // On enleve le chemin de l'image initialement uploadée
          req.file.path = path.join("images", `resized-${filename}.webp`); // pour le remplacer par celui de la nouvelle
          next();
        });
      })
      .catch((err) => res.status(400).json({ err }));
  }
};

module.exports = resizeImg;
