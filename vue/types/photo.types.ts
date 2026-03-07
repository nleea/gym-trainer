export type PhotoType = 'progress' | 'profile' | 'nutrition' | 'training'

export interface Photo {
  id:          string
  clientId:    string
  uploadedBy:  string
  type:        PhotoType
  url:         string
  notes?:      string
  takenAt:     string   // 'YYYY-MM-DD'
  createdAt:   string
}

export interface PhotoTimelineGroup {
  date:   string
  photos: Photo[]
}

export interface PhotoTimeline {
  type:   PhotoType
  groups: PhotoTimelineGroup[]
}
