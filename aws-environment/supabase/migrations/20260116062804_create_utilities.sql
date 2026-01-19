-- Trigger function to auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all mutable tables
create trigger update_instances_updated_at before update on instances
  for each row execute function update_updated_at_column();

create trigger update_autoscaling_groups_updated_at before update on autoscaling_groups
  for each row execute function update_updated_at_column();

create trigger update_container_clusters_updated_at before update on container_clusters
  for each row execute function update_updated_at_column();

create trigger update_container_nodes_updated_at before update on container_nodes
  for each row execute function update_updated_at_column();

create trigger update_lambda_functions_updated_at before update on lambda_functions
  for each row execute function update_updated_at_column();

create trigger update_volumes_updated_at before update on volumes
  for each row execute function update_updated_at_column();

create trigger update_rds_instances_updated_at before update on rds_instances
  for each row execute function update_updated_at_column();

create trigger update_cache_clusters_updated_at before update on cache_clusters
  for each row execute function update_updated_at_column();

create trigger update_load_balancers_updated_at before update on load_balancers
  for each row execute function update_updated_at_column();

create trigger update_elastic_ips_updated_at before update on elastic_ips
  for each row execute function update_updated_at_column();

create trigger update_managed_services_updated_at before update on managed_services
  for each row execute function update_updated_at_column();

create trigger update_streaming_clusters_updated_at before update on streaming_clusters
  for each row execute function update_updated_at_column();

create trigger update_container_services_updated_at before update on container_services
  for each row execute function update_updated_at_column();
