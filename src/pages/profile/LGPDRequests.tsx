import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Plus, Info, FileText, Clock, Download } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useLGPD, useUserLGPDRequests } from "@/hooks/useLGPD";
import { LGPDRequestCard } from "@/components/lgpd/LGPDRequestCard";
import { NewLGPDRequestDialog } from "@/components/lgpd/NewLGPDRequestDialog";
import { EmptyState } from "@/components/states";

function LGPDRequests() {
  const { t } = useI18n();
  const lgpd = useLGPD();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "completed">("all");

  const { requests, isLoading, createRequest, isCreating, pendingCount } = useUserLGPDRequests();

  const filteredRequests = requests.filter((request) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "pending")
      return request.status === "pending" || request.status === "requires_info" || request.status === "under_review";
    if (selectedStatus === "completed")
      return request.status === "completed" || request.status === "denied" || request.status === "failed";
    return true;
  });

  return (
    <AppLayout
      header={{
        title: "Privacidade e Dados (LGPD)",
        showBack: true,
      }}
    >
      <div className="py-4 space-y-6">
        {/* Info Alert */}
        <Alert className="py-3 px-4">
          <Shield className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">{t("lgpd.rightsTitle")}</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1 opacity-90">
            {t("lgpd.rightsDescription")}
          </AlertDescription>
        </Alert>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("lgpd.totalRequests")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("lgpd.pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("lgpd.completed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {requests.filter((r) => r.status === "completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Request Button */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button className="w-full" size="lg" variant="outline" onClick={() => setIsNewRequestOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("lgpd.newRequest")}
          </Button>

          {lgpd.exportEnabled && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => createRequest({ requestType: "data_portability", userMessage: "Solicitação de exportação via painel rápido" })}
              disabled={isCreating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isCreating ? t("lgpd.processing") : t("lgpd.exportData")}
            </Button>
          )}
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("lgpd.historyTitle")}
            </CardTitle>
            <CardDescription>
              {t("lgpd.historyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
              <TabsList className="w-full grid grid-cols-3 h-auto p-1 overflow-x-auto">
                <TabsTrigger value="all" className="text-[10px] sm:text-xs py-2 whitespace-normal h-full">
                  {t("lgpd.all")} ({requests.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-[10px] sm:text-xs py-2 whitespace-normal h-full">
                  {t("lgpd.pending")} ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-[10px] sm:text-xs py-2 whitespace-normal h-full">
                  {t("lgpd.completed")} ({requests.filter(r => r.status === "completed").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus} className="mt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title={
                      selectedStatus === "all"
                        ? t("lgpd.emptyAllTitle")
                        : selectedStatus === "pending"
                          ? t("lgpd.emptyPendingTitle")
                          : t("lgpd.emptyCompletedTitle")
                    }
                    description={
                      selectedStatus === "all"
                        ? t("lgpd.emptyAllDescription")
                        : selectedStatus === "pending"
                          ? t("lgpd.emptyPendingDescription")
                          : t("lgpd.emptyCompletedDescription")
                    }
                  />
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {filteredRequests.map((request) => (
                        <LGPDRequestCard
                          key={request.id}
                          request={request}
                          showDetails
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-5 w-5" />
              {t("lgpd.infoTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              <strong>{t("lgpd.infoDeadline")}</strong> {t("lgpd.infoDeadlineValue")}
            </p>
            <p>
              <strong>{t("lgpd.infoProtected")}</strong> {t("lgpd.infoProtectedValue")}
            </p>
            <p>
              <strong>{t("lgpd.infoAnon")}</strong> {t("lgpd.infoAnonValue")}
            </p>
            <p>
              <strong>{t("lgpd.infoSupport")}</strong> {t("lgpd.infoSupportValue")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Request Dialog */}
      <NewLGPDRequestDialog
        open={isNewRequestOpen}
        onOpenChange={setIsNewRequestOpen}
        onSubmit={async (params) => {
          await createRequest(params);
        }}
        isSubmitting={isCreating}
      />
    </AppLayout>
  );
}

export default LGPDRequests;
