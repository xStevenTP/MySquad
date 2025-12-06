export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_teams: {
        Row: {
          id: string
          user_id: string
          team_api_id: string
          league_type: string
          team_data: Json
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_api_id: string
          league_type: string
          team_data: Json
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_api_id?: string
          league_type?: string
          team_data?: Json
          added_at?: string
        }
      }
      teams_cache: {
        Row: {
          id: string
          api_id: string
          league_type: string
          data: Json
          updated_at: string
        }
        Insert: {
          id?: string
          api_id: string
          league_type: string
          data: Json
          updated_at?: string
        }
        Update: {
          id?: string
          api_id?: string
          league_type?: string
          data?: Json
          updated_at?: string
        }
      }
      schedules_cache: {
        Row: {
          id: string
          team_api_id: string
          league_type: string
          games: Json
          updated_at: string
        }
        Insert: {
          id?: string
          team_api_id: string
          league_type: string
          games: Json
          updated_at?: string
        }
        Update: {
          id?: string
          team_api_id?: string
          league_type?: string
          games?: Json
          updated_at?: string
        }
      }
      standings_cache: {
        Row: {
          id: string
          league_id: string
          league_type: string
          data: Json
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          league_type: string
          data: Json
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          league_type?: string
          data?: Json
          updated_at?: string
        }
      }
    }
  }
}

export interface UserTeam {
  id: string
  user_id: string
  team_api_id: string
  league_type: string
  team_data: {
    name: string
    logo?: string
    league_name: string
  }
  added_at: string
}

export type LeagueType = 'nba' | 'nfl' | 'mlb' | 'nhl' | 'lol' | 'csgo' | 'valorant' | 'dota2'
