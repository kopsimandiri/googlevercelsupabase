/**
 * KOPSIM MANDIRI SUPABASE DATABASE CONTRACT & DOMAIN TYPES
 * Auto-generated / standardized schema definitions matching PostgreSQL contracts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: number;
          referral_type: string;
          kopwil: string;
          area_code: string;
          area_name: string;
          bank_account_1: string;
          bank_account_2: string;
          bank_account_3: string;
          province: string;
          city: string;
          sk_number: string;
          potential: string;
          pic_name: string;
          pic_contact: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          referral_type?: string;
          kopwil?: string;
          area_code: string;
          area_name: string;
          bank_account_1?: string;
          bank_account_2?: string;
          bank_account_3?: string;
          province?: string;
          city?: string;
          sk_number?: string;
          potential?: string;
          pic_name?: string;
          pic_contact?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          referral_type?: string;
          kopwil?: string;
          area_code?: string;
          area_name?: string;
          bank_account_1?: string;
          bank_account_2?: string;
          bank_account_3?: string;
          province?: string;
          city?: string;
          sk_number?: string;
          potential?: string;
          pic_name?: string;
          pic_contact?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chart_of_accounts: {
        Row: {
          id: string;
          account_code: string;
          account_name: string;
          account_group: string;
          financial_report: string;
          normal_balance: 'Debit' | 'Kredit';
          tx_type: string;
          parent_code?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          account_code: string;
          account_name: string;
          account_group: string;
          financial_report: string;
          normal_balance: 'Debit' | 'Kredit';
          tx_type?: string;
          parent_code?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_code?: string;
          account_name?: string;
          account_group?: string;
          financial_report?: string;
          normal_balance?: 'Debit' | 'Kredit';
          tx_type?: string;
          parent_code?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transaction_categories: {
        Row: {
          id: number;
          type: 'SIMPANAN' | 'PINJAMAN' | 'PROJECT' | 'OPERASIONAL' | 'LAINNYA';
          category_code: string;
          name: string;
          account_code?: string | null;
          account_name?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          type: 'SIMPANAN' | 'PINJAMAN' | 'PROJECT' | 'OPERASIONAL' | 'LAINNYA';
          category_code: string;
          name: string;
          account_code?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          type?: 'SIMPANAN' | 'PINJAMAN' | 'PROJECT' | 'OPERASIONAL' | 'LAINNYA';
          category_code?: string;
          name?: string;
          account_code?: string | null;
          account_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          customer_code: string;
          name: string;
          pic_name: string;
          phone: string;
          email?: string;
          address: string;
          province: string;
          city: string;
          tax_number?: string;
          category: string;
          status: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          customer_code: string;
          name: string;
          pic_name?: string;
          phone?: string;
          email?: string;
          address?: string;
          province?: string;
          city?: string;
          tax_number?: string;
          category?: string;
          status?: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_code?: string;
          name?: string;
          pic_name?: string;
          phone?: string;
          email?: string;
          address?: string;
          province?: string;
          city?: string;
          tax_number?: string;
          category?: string;
          status?: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          supplier_code: string;
          name: string;
          pic_name: string;
          phone: string;
          email?: string;
          address: string;
          province: string;
          city: string;
          tax_number?: string;
          category: string;
          status: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          supplier_code: string;
          name: string;
          pic_name?: string;
          phone?: string;
          email?: string;
          address?: string;
          province?: string;
          city?: string;
          tax_number?: string;
          category?: string;
          status?: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_code?: string;
          name?: string;
          pic_name?: string;
          phone?: string;
          email?: string;
          address?: string;
          province?: string;
          city?: string;
          tax_number?: string;
          category?: string;
          status?: 'AKTIF' | 'NONAKTIF';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          sku_code: string;
          sku_name: string;
          group_id: string;
          group_name: string;
          subgroup?: string;
          brand?: string;
          grade: string;
          packaging: string;
          availability: string;
          moq: number;
          supply_capacity: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          sku_code: string;
          sku_name: string;
          group_id?: string;
          group_name?: string;
          subgroup?: string;
          brand?: string;
          grade?: string;
          packaging?: string;
          availability?: string;
          moq?: number;
          supply_capacity?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku_code?: string;
          sku_name?: string;
          group_id?: string;
          group_name?: string;
          subgroup?: string;
          brand?: string;
          grade?: string;
          packaging?: string;
          availability?: string;
          moq?: number;
          supply_capacity?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          member_no: string;
          registered_at: string;
          full_name: string;
          gender: 'L' | 'P';
          province: string;
          city: string;
          address: string;
          occupation: string;
          username: string;
          birth_date: string;
          birth_place: string;
          nik: string;
          work_area: string;
          legacy_password_hash?: string;
          avatar_url?: string;
          status: 'AKTIF' | 'NONAKTIF' | 'PENDING' | 'SUSPENDED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          member_no: string;
          registered_at?: string;
          full_name: string;
          gender?: 'L' | 'P';
          province?: string;
          city?: string;
          address?: string;
          occupation?: string;
          username?: string;
          birth_date?: string;
          birth_place?: string;
          nik: string;
          work_area?: string;
          legacy_password_hash?: string;
          avatar_url?: string;
          status?: 'AKTIF' | 'NONAKTIF' | 'PENDING' | 'SUSPENDED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_no?: string;
          registered_at?: string;
          full_name?: string;
          gender?: 'L' | 'P';
          province?: string;
          city?: string;
          address?: string;
          occupation?: string;
          username?: string;
          birth_date?: string;
          birth_place?: string;
          nik?: string;
          work_area?: string;
          legacy_password_hash?: string;
          avatar_url?: string;
          status?: 'AKTIF' | 'NONAKTIF' | 'PENDING' | 'SUSPENDED';
          created_at?: string;
          updated_at?: string;
        };
      };
      member_registrations: {
        Row: {
          id: string;
          submitted_at: string;
          full_name: string;
          nik: string;
          birth_place: string;
          birth_date: string;
          gender: string;
          address: string;
          city: string;
          province: string;
          whatsapp: string;
          email?: string;
          member_status: string;
          profession: string;
          savings_type: string;
          transfer_amount: number;
          transfer_date: string;
          transfer_proof_url?: string;
          ktp_url?: string;
          selfie_url?: string;
          approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
          verification_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          submitted_at?: string;
          full_name: string;
          nik: string;
          birth_place?: string;
          birth_date?: string;
          gender?: string;
          address?: string;
          city?: string;
          province?: string;
          whatsapp: string;
          email?: string;
          member_status?: string;
          profession?: string;
          savings_type?: string;
          transfer_amount?: number;
          transfer_date?: string;
          transfer_proof_url?: string;
          ktp_url?: string;
          selfie_url?: string;
          approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submitted_at?: string;
          full_name?: string;
          nik?: string;
          birth_place?: string;
          birth_date?: string;
          gender?: string;
          address?: string;
          city?: string;
          province?: string;
          whatsapp?: string;
          email?: string;
          member_status?: string;
          profession?: string;
          savings_type?: string;
          transfer_amount?: number;
          transfer_date?: string;
          transfer_proof_url?: string;
          ktp_url?: string;
          selfie_url?: string;
          approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          transaction_no: string;
          transaction_date: string;
          referral_type: 'KOPERASI' | 'PROJECT';
          area_name: string;
          transaction_type: 'MASUK' | 'KELUAR';
          payment_method: string;
          amount: number;
          file_url?: string;
          account_name_legacy?: string;
          description?: string;
          category_name?: string;
          product_name?: string;
          supplier_name?: string;
          customer_name?: string;
          qty?: number;
          price?: number;
          member_id?: string | null;
          category_code?: string | null;
          account_code?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          transaction_no: string;
          transaction_date?: string;
          referral_type?: 'KOPERASI' | 'PROJECT';
          area_name?: string;
          transaction_type: 'MASUK' | 'KELUAR';
          payment_method?: string;
          amount: number;
          file_url?: string;
          account_name_legacy?: string;
          description?: string;
          category_name?: string;
          product_name?: string;
          supplier_name?: string;
          customer_name?: string;
          qty?: number;
          price?: number;
          member_id?: string | null;
          category_code?: string | null;
          account_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          transaction_no?: string;
          transaction_date?: string;
          referral_type?: 'KOPERASI' | 'PROJECT';
          area_name?: string;
          transaction_type?: 'MASUK' | 'KELUAR';
          payment_method?: string;
          amount?: number;
          file_url?: string;
          account_name_legacy?: string;
          description?: string;
          category_name?: string;
          product_name?: string;
          supplier_name?: string;
          customer_name?: string;
          qty?: number;
          price?: number;
          member_id?: string | null;
          category_code?: string | null;
          account_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      news_articles: {
        Row: {
          id: string;
          kategori: 'kemitraan' | 'program' | 'dampak' | 'update_proyek';
          project_id?: string | null;
          judul: string;
          ringkasan: string;
          konten: string;
          lokasi?: string | null;
          foto_url?: string | null;
          tanggal: string;
          dibuat_oleh?: string | null;
          status: 'draft' | 'terbit';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kategori: 'kemitraan' | 'program' | 'dampak' | 'update_proyek';
          project_id?: string | null;
          judul: string;
          ringkasan: string;
          konten: string;
          lokasi?: string | null;
          foto_url?: string | null;
          tanggal?: string;
          dibuat_oleh?: string | null;
          status?: 'draft' | 'terbit';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kategori?: 'kemitraan' | 'program' | 'dampak' | 'update_proyek';
          project_id?: string | null;
          judul?: string;
          ringkasan?: string;
          konten?: string;
          lokasi?: string | null;
          foto_url?: string | null;
          tanggal?: string;
          dibuat_oleh?: string | null;
          status?: 'draft' | 'terbit';
          created_at?: string;
          updated_at?: string;
        };
      };
      project_updates: {
        Row: {
          id: string;
          project_id: string;
          judul: string;
          narasi: string;
          foto_url?: string | null;
          tanggal: string;
          dibuat_oleh?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          project_id: string;
          judul: string;
          narasi: string;
          foto_url?: string | null;
          tanggal?: string;
          dibuat_oleh?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          judul?: string;
          narasi?: string;
          foto_url?: string | null;
          tanggal?: string;
          dibuat_oleh?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name?: string | null;
          role: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          phone?: string | null;
          avatar_url?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id?: string | null;
          role: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id?: string | null;
          role?: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string | null;
          role?: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_name: string;
          permissions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_name: string;
          permissions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_name?: string;
          permissions?: Json;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id?: string | null;
          user_email?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      generate_transaction_id: {
        Args: {
          tipe: string;
          tanggal?: string;
        };
        Returns: string;
      };
      verify_member_login: {
        Args: {
          p_username: string;
          p_password: string;
        };
        Returns: Json;
      };
      change_member_password: {
        Args: {
          p_member_no: string;
          p_new_password: string;
        };
        Returns: Json;
      };
    };
  };
}
