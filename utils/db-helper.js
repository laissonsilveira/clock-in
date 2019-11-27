const mongoose = require('mongoose');

class DBHelper {

    constructor(collection) {
        this.collection = mongoose.model(collection);
    }

    insertDoc(doc) {
        return new this.collection(doc).save();
    }

    listDocs() {
        return this.collection.find({}).lean();
    }

    deleteDoc(id) {
        return this.collection.findByIdAndDelete(id).lean();
    }

}

module.exports = DBHelper;