-- Run once in Supabase SQL Editor to synchronize the two papers added on 2026-11-13.
insert into public.research_papers(id,title,authors,venue,year,doi,category,modalities,pdf_url,publisher_url,details) values
('p-tip-landmarks','Oriented Ship Detection via Key Structural Landmarks in Optical Remote Sensing Image','Youmei Zhang; Yang Yu; Bin Li; Zhiheng Li; Mingxin Zhang; Runmin Cong; Wei Zhang','IEEE Transactions on Image Processing',2026,'10.1109/TIP.2026.3748963','ship detection',array['Optical remote sensing'],null,'https://doi.org/10.1109/TIP.2026.3748963','{"status":"ahead_of_print","project":"https://vsislab.github.io/OSD-KS/"}'),
('p-ua-fusiondet','UA-FusionDet: Unregistered-Aware Infrared-Visible Fusion with Cross-Modal Feature Alignment for Maritime Ship Perception','Runbang Liu; Zhiyu Zhu; Huilin Ge; Jing Wang; Yongdong Shu; Qingshan Ji','Journal of Marine Science and Engineering',2026,'10.3390/jmse14171611','infrared-visible fusion',array['RGB','LWIR'],'https://www.mdpi.com/2077-1312/14/17/1611/pdf','https://www.mdpi.com/2077-1312/14/17/1611','{"status":"published","open_access":true}')
on conflict(id) do update set
 title=excluded.title,authors=excluded.authors,venue=excluded.venue,year=excluded.year,doi=excluded.doi,
 category=excluded.category,modalities=excluded.modalities,pdf_url=excluded.pdf_url,
 publisher_url=excluded.publisher_url,details=excluded.details;
