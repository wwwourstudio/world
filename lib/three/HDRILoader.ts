export interface HDRIAsset {
  id: string
  name: string
  categories: string[]
  previewUrl: string
  downloadUrl: string
}

export const BUILT_IN_HDRIS: HDRIAsset[] = [
  { id: 'golden_bay', name: 'Golden Bay', categories: ['outdoor', 'nature'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/golden_bay.png?width=256', downloadUrl: '/api/hdri/golden_bay' },
  { id: 'forest_slope', name: 'Forest Slope', categories: ['outdoor', 'nature', 'forest'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/forest_slope.png?width=256', downloadUrl: '/api/hdri/forest_slope' },
  { id: 'satara_night', name: 'Satara Night', categories: ['outdoor', 'urban', 'night'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/satara_night.png?width=256', downloadUrl: '/api/hdri/satara_night' },
  { id: 'kiara_interior', name: 'Kiara Interior', categories: ['indoor', 'studio'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/kiara_1_interior.png?width=256', downloadUrl: '/api/hdri/kiara_1_interior' },
  { id: 'starlit_golf', name: 'Starlit Golf', categories: ['outdoor', 'night'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/starlit_golf.png?width=256', downloadUrl: '/api/hdri/starlit_golf' },
  { id: 'abandoned_hopper', name: 'Industrial', categories: ['indoor', 'urban'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/abandoned_hopper.png?width=256', downloadUrl: '/api/hdri/abandoned_hopper' },
  { id: 'misty_pines', name: 'Misty Pines', categories: ['outdoor', 'nature', 'forest'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/misty_pines.png?width=256', downloadUrl: '/api/hdri/misty_pines' },
  { id: 'venice_sunset', name: 'Venice Sunset', categories: ['outdoor', 'urban'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/venice_sunset.png?width=256', downloadUrl: '/api/hdri/venice_sunset' },
  { id: 'overcast_soil', name: 'Overcast', categories: ['outdoor', 'nature'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/overcast_soil.png?width=256', downloadUrl: '/api/hdri/overcast_soil' },
  { id: 'studio_small_04', name: 'Studio', categories: ['indoor', 'studio'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/studio_small_04.png?width=256', downloadUrl: '/api/hdri/studio_small_04' },
  { id: 'kloofendal_48d_partly_cloudy', name: 'Partly Cloudy', categories: ['outdoor', 'nature'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/kloofendal_48d_partly_cloudy.png?width=256', downloadUrl: '/api/hdri/kloofendal_48d_partly_cloudy' },
  { id: 'industrial_sunset_puresky', name: 'Industrial Sunset', categories: ['outdoor', 'urban'], previewUrl: 'https://cdn.polyhaven.com/asset_img/thumbs/industrial_sunset_puresky.png?width=256', downloadUrl: '/api/hdri/industrial_sunset_puresky' },
]

export const HDRI_CATEGORIES = ['all', 'outdoor', 'indoor', 'nature', 'urban', 'studio', 'night', 'forest']

export function filterHDRIs(assets: HDRIAsset[], category: string, search: string): HDRIAsset[] {
  return assets.filter((a) => {
    const matchCat = category === 'all' || a.categories.includes(category)
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search.toLowerCase())
    return matchCat && matchSearch
  })
}
