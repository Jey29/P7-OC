const Book = require("../models/book");
const fs = require("fs");

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.getBookById = (req, res, next) => {
  const bookId = req.params.id;
  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé" });
      }
      res.status(200).json(book);
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  console.log(bookObject);
  delete bookObject._id;
  delete bookObject._userId;
  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get(
      "host"
    )}/images/resized-${req.file.filename.replace(/\.[^.]*$/, "")}.webp`,
    ratings: {
      userId: req.auth.userId,
      grade: bookObject.ratings[0].grade,
    },
    averageRating: bookObject.ratings[0].grade,
  });
  book
    .save()
    .then(() => {
      res.status(201).json({ message: "Objet enregistré !" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get(
          "host"
        )}/images/resized-${req.file.filename.replace(/\.[^.]*$/, "")}.webp`,
      }
    : { ...req.body };
  delete bookObject._userId;
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      //on verifie si l'utilisateur correspond au userId de celui qui a crée le book
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        if (req.file) {
          //S'il y a une nouvelle image, on supprime (unlink) et remplace (updateOne) l'ancienne
          const oldImg = book.imageUrl.split("/images/")[1];
          fs.unlink(`images/${oldImg}`, () => {
            Book.updateOne(
              { _id: req.params.id },
              { ...bookObject, _id: req.params.id }
            )
              .then(() => res.status(200).json({ message: "Livre modifié!" }))
              .catch((error) => res.status(400).json({ error }));
          });
        } else {
          //S'il n'y a pas de nouvelle image, on met à jour les infos du livres
          Book.updateOne(
            { _id: req.params.id },
            { ...bookObject, _id: req.params.id }
          )
            .then(() => res.status(200).json({ message: "Livre modifié!" }))
            .catch((error) => res.status(400).json({ error }));
        }
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Non autorisé" });
      } else {
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () =>
          Book.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Livre supprimé" });
            })
            .catch((error) => res.status(401).json({ error }))
        );
      }
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.rateBook = (req, res, next) => {
  const bookId = req.params.id;
  const { userId, rating } = req.body;

  // Vérifier si la note est valide (comprise entre 0 et 5)
  if (rating < 0 || rating > 5) {
    return res
      .status(400)
      .json({ message: "La note doit être comprise entre 0 et 5" });
  }

  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé" });
      }

      // Vérifier si l'utilisateur a déjà noté ce livre
      const userRatingIndex = book.ratings.findIndex(
        (r) => r.userId === userId
      );
      if (userRatingIndex !== -1) {
        return res
          .status(400)
          .json({ message: "L'utilisateur a déjà noté ce livre" });
      }

      // Ajouter la nouvelle note dans le tableau "ratings"
      book.ratings.push({ userId, grade: rating });

      // Recalculer la note moyenne "averageRating"
      const ratingsSum = book.ratings.reduce((sum, r) => sum + r.grade, 0);
      book.averageRating = ratingsSum / book.ratings.length;

      // Enregistrer les modifications du livre
      book
        .save()
        .then((updatedBook) => {
          res.status(200).json(updatedBook);
        })
        .catch((error) => {
          res.status(500).json({ error });
        });
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.getBestRatedBooks = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};
