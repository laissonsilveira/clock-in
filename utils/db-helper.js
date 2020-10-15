const mongoose = require('mongoose');

class DBHelper {

    constructor(collection) {
        this.collection = mongoose.model(collection);
    }

    insertDoc(doc) {
        return new this.collection(doc).save();
    }

    insertManyDoc(docs) {
        return this.collection.insertMany(docs);
    }

    updateDoc(filter, update) {
        return this.collection.updateOne(filter, update, { upsert: true });
    }

    listDocs(filter = {}) {
        return this.collection.find(filter).lean();
    }

    deleteDoc(id) {
        return this.collection.findByIdAndDelete(id).lean();
    }

}

module.exports = DBHelper;