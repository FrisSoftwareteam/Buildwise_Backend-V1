import { useState } from "react";
import { useListVendors, useCreateVendor } from "@workspace/api-client-react";
import { Card, Button, Badge, Input, Dialog } from "@/components/ui/shared";
import { getStatusColor } from "@/lib/utils";
import { Plus, Search, Building2, Phone, Mail, Globe, Briefcase } from "lucide-react";
import { format } from "date-fns";

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: vendors, isLoading } = useListVendors();
  
  const createMutation = useCreateVendor({
    mutation: {
      onSuccess: () => {
        setIsCreateOpen(false);
        window.location.reload();
      }
    }
  });

  const filteredVendors = vendors?.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Vendor Directory</h2>
          <p className="text-slate-400 text-sm">Manage third-party partners and contractors.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search vendors..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVendors?.map(vendor => (
          <Card key={vendor.id} className="overflow-hidden hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                </div>
                <Badge variant="custom" className={getStatusColor(vendor.status)}>
                  {vendor.status.toUpperCase()}
                </Badge>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1">{vendor.name}</h3>
              <p className="text-sm text-indigo-400 mb-6 font-medium">{vendor.specialization || "General Contractor"}</p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center text-slate-400">
                  <Globe className="w-4 h-4 mr-3 text-slate-500" />
                  {vendor.country || 'Global'}
                </div>
                {vendor.contactEmail && (
                  <div className="flex items-center text-slate-400">
                    <Mail className="w-4 h-4 mr-3 text-slate-500" />
                    {vendor.contactEmail}
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center text-slate-400">
                    <Phone className="w-4 h-4 mr-3 text-slate-500" />
                    {vendor.contactPhone}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-900/50 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
              <span>Added {format(new Date(vendor.createdAt), 'MMM yyyy')}</span>
              <Button variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">View Profile</Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Vendor">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({
            data: {
              name: fd.get('name') as string,
              contactName: fd.get('contactName') as string,
              contactEmail: fd.get('contactEmail') as string,
              status: fd.get('status') as any,
              specialization: fd.get('specialization') as string,
              country: fd.get('country') as string,
            }
          });
        }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vendor Company Name</label>
            <Input name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Specialization</label>
              <Input name="specialization" placeholder="e.g. Cloud Security" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
              <select name="status" className="w-full h-10 rounded-lg border border-border bg-input/50 px-3 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Primary Contact</label>
              <Input name="contactName" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact Email</label>
              <Input name="contactEmail" type="email" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Country</label>
            <Input name="country" />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-500">Register Vendor</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
