/*
  # Create storage bucket for offer documents

  1. New Storage Bucket
    - Create 'offer-documents' bucket for storing promotional offer documents
    - Set up RLS policies for secure access

  2. Security
    - Enable RLS on the bucket
    - Add policies for authenticated users to read documents
    - Add policies for wholesalers to manage their documents
*/

-- Create storage bucket for offer documents
insert into storage.buckets (id, name, public)
values ('offer-documents', 'offer-documents', false);

-- Enable RLS
create policy "Authenticated users can read offer documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'offer-documents'
  and (
    -- Check if the user has access to the offer
    exists (
      select 1
      from public.promotional_offers o
      where o.id::text = (storage.foldername(name))[1]
      and (
        -- Public offers are readable by all authenticated users
        o.is_public = true
        -- Current offers are readable by all authenticated users
        or (current_timestamp >= o.start_date and current_timestamp <= o.end_date)
      )
    )
  )
);

-- Allow wholesalers to manage their own documents
create policy "Wholesalers can manage their offer documents"
on storage.objects for all
to authenticated
using (
  bucket_id = 'offer-documents'
  and (
    exists (
      select 1
      from public.promotional_offers o
      join public.users u on u.id = o.wholesaler_id
      where o.id::text = (storage.foldername(name))[1]
      and u.id = auth.uid()
      and u.role = 'wholesaler'
    )
  )
)
with check (
  bucket_id = 'offer-documents'
  and (
    exists (
      select 1
      from public.promotional_offers o
      join public.users u on u.id = o.wholesaler_id
      where o.id::text = (storage.foldername(name))[1]
      and u.id = auth.uid()
      and u.role = 'wholesaler'
    )
  )
);