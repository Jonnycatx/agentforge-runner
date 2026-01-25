import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { EmployeeCard } from "@/components/employee-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import {
  Search,
  X,
  Users,
  Sparkles,
  ArrowRight,
  Wrench,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import {
  agentEmployees,
  employeeCategories,
  type AgentEmployeeTemplate,
  type SkillLevel,
  buildEmployeeConfig,
} from "@/lib/agent-employees";

function getIconComponent(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.User;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function Employees() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<AgentEmployeeTemplate | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();

  // Set document title
  document.title = "AI Employees | AgentForge";

  // Filter employees
  const filteredEmployees = agentEmployees.filter(emp => {
    const matchesSearch =
      searchQuery === "" ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || emp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category for "all" view
  const groupedEmployees = filteredEmployees.reduce((acc, emp) => {
    if (!acc[emp.category]) acc[emp.category] = [];
    acc[emp.category].push(emp);
    return acc;
  }, {} as Record<string, AgentEmployeeTemplate[]>);

  // Handle create employee
  const handleCreate = () => {
    if (!selectedEmployee) return;
    
    const variant = selectedEmployee.industryVariants?.find(v => v.id === selectedVariant);
    const config = buildEmployeeConfig(selectedEmployee, skillLevel, variant);
    
    // Navigate to builder with pre-filled config
    const params = new URLSearchParams({
      template: selectedEmployee.id,
      skillLevel,
      ...(selectedVariant && { variant: selectedVariant }),
    });
    
    // Store config in sessionStorage for builder to pick up
    sessionStorage.setItem("employeeConfig", JSON.stringify({
      ...config,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
    }));
    
    setLocation(`/builder?${params}`);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {agentEmployees.length} AI Employees Ready to Work
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Hire Your AI Team
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pre-configured AI employees with specialized skills, ready to automate your workflows. 
              Choose a role, customize the skill level, and deploy.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid sm:grid-cols-3 gap-4 mb-8"
          >
            <motion.div
              variants={fadeInUp}
              className="bg-card rounded-xl border p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agentEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Employee Types</p>
              </div>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="bg-card rounded-xl border p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">27</p>
                <p className="text-sm text-muted-foreground">Tools Available</p>
              </div>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="bg-card rounded-xl border p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agentEmployees.reduce((acc, e) => acc + (e.industryVariants?.length || 0), 0) + agentEmployees.length}
                </p>
                <p className="text-sm text-muted-foreground">Configurations</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, role, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All Employees
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {agentEmployees.length}
                </Badge>
              </TabsTrigger>
              {employeeCategories.map(cat => {
                const Icon = getIconComponent(cat.icon);
                const count = agentEmployees.filter(e => e.category === cat.id).length;
                return (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {cat.name}
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Employee Grid */}
          {selectedCategory === "all" ? (
            // Grouped view
            <motion.div initial="initial" animate="animate" variants={staggerContainer}>
              {Object.entries(groupedEmployees).map(([category, employees]) => {
                const catInfo = employeeCategories.find(c => c.id === category);
                if (!catInfo) return null;
                const Icon = getIconComponent(catInfo.icon);

                return (
                  <motion.div key={category} variants={fadeInUp} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${catInfo.color} flex items-center justify-center text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{catInfo.name}</h2>
                        <p className="text-sm text-muted-foreground">{employees.length} employee{employees.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employees.map(emp => (
                        <EmployeeCard
                          key={emp.id}
                          employee={emp}
                          onSelect={setSelectedEmployee}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            // Flat view
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredEmployees.map(emp => (
                <motion.div key={emp.id} variants={fadeInUp}>
                  <EmployeeCard
                    employee={emp}
                    onSelect={setSelectedEmployee}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {filteredEmployees.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-12 h-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">No employees found</h3>
              <p className="text-sm">Try adjusting your search or filter</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Employee Configuration Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-xl ${selectedEmployee.color} flex items-center justify-center text-white`}>
                    {(() => {
                      const Icon = getIconComponent(selectedEmployee.icon);
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedEmployee.name}</DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedEmployee.title}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {selectedEmployee.longDescription}
                </p>

                {/* Skill Level Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Skill Level
                  </label>
                  <Select
                    value={skillLevel}
                    onValueChange={(v) => setSkillLevel(v as SkillLevel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["basic", "intermediate", "advanced"] as SkillLevel[]).map(level => (
                        <SelectItem key={level} value={level}>
                          <div className="flex items-center gap-2">
                            {level === "basic" && <Star className="w-4 h-4 text-green-500" />}
                            {level === "intermediate" && <Zap className="w-4 h-4 text-blue-500" />}
                            {level === "advanced" && <Sparkles className="w-4 h-4 text-purple-500" />}
                            <span className="capitalize">{level}</span>
                            <span className="text-muted-foreground">
                              - {selectedEmployee.skillLevels[level].description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Tools for selected level */}
                  <div className="mt-3">
                    <span className="text-xs text-muted-foreground">Tools included:</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedEmployee.skillLevels[skillLevel].tools.map(tool => (
                        <Badge key={tool} variant="secondary" className="text-xs">
                          {tool.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Industry Variant (if available) */}
                {selectedEmployee.industryVariants && selectedEmployee.industryVariants.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Industry Specialization
                    </label>
                    <Select
                      value={selectedVariant || "none"}
                      onValueChange={(v) => setSelectedVariant(v === "none" ? undefined : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="General (no specialization)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">General (no specialization)</SelectItem>
                        {selectedEmployee.industryVariants.map(variant => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedVariant && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          {selectedEmployee.industryVariants.find(v => v.id === selectedVariant)?.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedEmployee.industryVariants
                            .find(v => v.id === selectedVariant)
                            ?.focusAreas.map(area => (
                              <Badge key={area} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Use Cases */}
                <div>
                  <span className="text-sm font-medium mb-2 block">What they can do:</span>
                  <ul className="space-y-1">
                    {selectedEmployee.useCases.slice(0, 4).map((useCase, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreate}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create {selectedEmployee.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
