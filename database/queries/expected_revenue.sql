SELECT vehicule_type.vehicles as v, vehicule_id.vehicles as vid, estimated_miles.declarations as d FROM vehicule_type, estimated_miles
JOIN d ON vid.vehicule = vid.declarations 
