# 📹 API Videos Endpoint

## Endpoint Creado

Se ha agregado el endpoint `/api/videos` para listar todos los videos públicos.

### Ruta
```
GET /api/videos
```

### Características
- ✅ **Público**: No requiere autenticación
- ✅ **Filtrado**: Solo devuelve contenido con `content_type = 'video'`
- ✅ **Ordenado**: Por fecha de creación (más recientes primero)
- ✅ **Límite**: Máximo 100 videos

### Respuesta

```json
{
  "success": true,
  "message": "Retrieved X videos",
  "content": [
    {
      "content_id": "uuid",
      "artist_id": "wallet_address",
      "artist_name": "Artist Name",
      "title": "Video Title",
      "description": "Video description",
      "genre": "Documentary",
      "content_type": "video",
      "file_url": "https://...",
      "ipfs_hash": "Qm...",
      "thumbnail_url": "https://...",
      "price": 10.0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Uso

```javascript
// Desde el navegador
fetch('https://api.dujyo.com/api/videos')
  .then(r => r.json())
  .then(data => console.log('Videos:', data))
  .catch(console.error);
```

### Endpoints Relacionados

- `GET /api/v1/content/artist/{artist_id}` - Lista contenido de un artista específico (requiere JWT)
- `GET /api/v1/content/{content_id}/file` - Obtiene el archivo de un contenido (requiere JWT)

### Notas

- Si no hay videos en la base de datos, devuelve un array vacío
- El endpoint consulta directamente la tabla `content` en PostgreSQL
- Los videos se filtran por `content_type = 'video'`

