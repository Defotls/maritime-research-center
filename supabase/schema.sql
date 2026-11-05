create extension if not exists pgcrypto;
create table if not exists public.research_papers(id text primary key,title text not null,authors text,venue text,year integer,doi text,category text,modalities text[] default '{}',pdf_url text,publisher_url text,details jsonb default '{}');
create table if not exists public.research_datasets(id text primary key,name text not null,modalities text[] default '{}',access_status text default 'unknown',description text,download_url text,metadata jsonb default '{}');
create table if not exists public.reproduction_progress(user_id uuid references auth.users(id) on delete cascade,paper_id text references public.research_papers(id) on delete cascade,status text default '未开始',checks jsonb default '[]',notes text default '',updated_at timestamptz default now(),primary key(user_id,paper_id));
alter table public.research_papers enable row level security;
alter table public.research_datasets enable row level security;
alter table public.reproduction_progress enable row level security;
drop policy if exists "Public read papers" on public.research_papers;
create policy "Public read papers" on public.research_papers for select to anon,authenticated using(true);
drop policy if exists "Public read datasets" on public.research_datasets;
create policy "Public read datasets" on public.research_datasets for select to anon,authenticated using(true);
drop policy if exists "Own progress only" on public.reproduction_progress;
create policy "Own progress only" on public.reproduction_progress for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select on public.research_papers,public.research_datasets to anon,authenticated;
grant select,insert,update,delete on public.reproduction_progress to authenticated;
insert into public.research_papers(id,title,year,doi,pdf_url,details) values
('p-amgt','AMGT UAV Multimodal Vessel Identification and Tracking',2026,'10.48550/arXiv.2610.13220','https://arxiv.org/pdf/2610.13220','{"status":"preprint"}'),
('p-feature-ais','Vessel Detection and Tracking Based on Feature-Level Fusion and AIS Enhancement',2026,'10.19693/j.issn.1673-3185.04841',null,'{"pdf_direct":"not_verified"}'),
('p-vision-radar','Dynamic Object Detection in Maritime Navigation Scenarios Based on Vision-Radar Fusion',2026,'10.3390/s26113508','https://www.mdpi.com/1424-8220/26/11/3508/pdf','{"dataset":"MVRD"}'),
('deepsorvf','Asynchronous Trajectory Matching-Based Multimodal Maritime Data Fusion',2023,'10.1109/TITS.2023.3285415','https://arxiv.org/pdf/2302.11283','{"dataset":"FVessel"}'),
('naveye','NavEYE Vision-Centered Multi-Sensor Fusion',2026,'10.1016/j.oceaneng.2026.126781','https://arxiv.org/pdf/2607.03915','{"dataset":"MAPFusion"}'),
('lidarais','Fusion of LiDAR and AIS Data for Improved Maritime Object Detection',2026,'10.1016/j.conengprac.2026.107100','https://papers.ssrn.com/sol3/Delivery.cfm/f1a51e4f-f144-4da3-b477-c93a7cbd0ed6-MECA.pdf?abstractid=5733617&mirid=1','{"pdf_version":"SSRN preprint"}'),
('attentionoffsetnet','Attention OffsetNet Optical-SAR Registration',2026,'10.1109/JSTARS.2026.3731425',null,'{"pdf_direct":"not_verified"}')
on conflict(id) do update set title=excluded.title,year=excluded.year,doi=excluded.doi,pdf_url=excluded.pdf_url,details=excluded.details;
insert into public.research_datasets(id,name,modalities,access_status,description,download_url) values
('fves','FVessel V1.0 / V2.0',array['AIS','RGB video'],'public','26 组融合数据和 7,625 张检测图像。','https://github.com/gy65896/FVessel'),
('lidar-marina','Maritime LiDAR-AIS test subset',array['3D LiDAR','AIS'],'public_subset','600 帧测试子集。','https://doi.org/10.5281/zenodo.20345163'),
('mapfusion','MAPFusion',array['RGB','AIS','Radar'],'unknown','NavEYE 船载多传感器数据，公开入口未核实。',null),
('kompsat-sar','KOMPSAT-3A / TerraSAR-X',array['Optical','Satellite SAR'],'unknown','卫星图像配准数据，公开入口未核实。',null),
('map-m2uav50','MAP-M2UAV50',array['RGB','IR','AIS','UAV'],'unknown','AMGT 报告约 12K 图像和 50 段视频。',null),
('mvrd','MVRD',array['mmWave radar','RGB'],'request','3,848 图像、3,848 雷达帧、28,332 目标标注。',null)
on conflict(id) do update set name=excluded.name,modalities=excluded.modalities,access_status=excluded.access_status,description=excluded.description,download_url=excluded.download_url;

-- Private personal PDF storage. Files are stored under <auth.uid()>/<paper_id>/<filename>.
create table if not exists public.paper_pdf_files (
 user_id uuid not null references auth.users(id) on delete cascade,
 paper_id text not null references public.research_papers(id) on delete cascade,
 storage_path text not null,
 file_name text not null,
 updated_at timestamptz not null default now(),
 primary key(user_id,paper_id)
);
alter table public.paper_pdf_files enable row level security;
drop policy if exists "Own PDF metadata only" on public.paper_pdf_files;
create policy "Own PDF metadata only" on public.paper_pdf_files
 for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on public.paper_pdf_files to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('paper-pdfs','paper-pdfs',false,104857600,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=104857600,allowed_mime_types=array['application/pdf'];
drop policy if exists "Own paper PDF read" on storage.objects;
create policy "Own paper PDF read" on storage.objects for select to authenticated
 using(bucket_id='paper-pdfs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Own paper PDF upload" on storage.objects;
create policy "Own paper PDF upload" on storage.objects for insert to authenticated
 with check(bucket_id='paper-pdfs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Own paper PDF update" on storage.objects;
create policy "Own paper PDF update" on storage.objects for update to authenticated
 using(bucket_id='paper-pdfs' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='paper-pdfs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Own paper PDF delete" on storage.objects;
create policy "Own paper PDF delete" on storage.objects for delete to authenticated
 using(bucket_id='paper-pdfs' and (storage.foldername(name))[1]=auth.uid()::text);
