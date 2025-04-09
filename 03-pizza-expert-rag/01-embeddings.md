# Understanding Embeddings
## What are Embeddings? 🤔

Embeddings are a way to transform data (like text) into numerical vectors. Think of it as giving "coordinates" to data points in a mathematical space where:

- **Similar** elements are placed **close** together
- **Different** elements are placed **far apart**

<img src="imgs/embeddings.svg" width="50%" height="50%">


### Practical Applications

1. **Semantic Search**
  - Finding similar documents
  - Image similarity search
  - Product recommendations

### In RAG Context
This is particularly important for RAG (Retrieval Augmented Generation) because:

- Documents are converted to embeddings
- User queries are also converted to embeddings
- Similarity search finds relevant documents by comparing these vectors
- **Close** vectors = **semantically** related content