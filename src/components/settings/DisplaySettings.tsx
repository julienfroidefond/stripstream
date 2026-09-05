import { useCallback } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Filter, Grid, ArrowUpDown, Eye, EyeOff } from "lucide-react";
import logger from "@/lib/logger";

type SortOrder = "title" | "latest";

const SORT_ORDERS: { value: SortOrder; labelKey: string }[] = [
  { value: "title", labelKey: "series.filters.sortTitle" },
  { value: "latest", labelKey: "series.filters.sortLatest" },
];

export function DisplaySettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handleToggleThumbnails = useCallback(async (checked: boolean) => {
    try {
      await updatePreferences({ showThumbnails: checked });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur détaillée:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  }, [updatePreferences, toast, t]);

  const handleToggleUnreadFilter = useCallback(async (checked: boolean) => {
    try {
      await updatePreferences({ showOnlyUnread: checked });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur détaillée:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  }, [updatePreferences, toast, t]);

  const handleSortOrderChange = useCallback(async (value: SortOrder) => {
    try {
      await updatePreferences({ defaultSortOrder: value });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  }, [updatePreferences, toast, t]);

  const handleShowMissingBooksChange = useCallback(async (checked: boolean) => {
    try {
      await updatePreferences({ showMissingBooks: checked });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  }, [updatePreferences, toast, t]);

  const handleHideMissingBooksChange = useCallback(async (checked: boolean) => {
    try {
      await updatePreferences({ hideMissingBooks: checked });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  }, [updatePreferences, toast, t]);

  return (
    <div className="space-y-6">
      {/* Library Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Grid className="h-5 w-5 text-primary" />
            <CardTitle>{t("settings.reader.library.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.reader.library.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Thumbnails */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="space-y-0.5">
                <Label htmlFor="thumbnails">{t("settings.display.thumbnails.label")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.display.thumbnails.description")}
                </p>
              </div>
            </div>
            <Switch
              id="thumbnails"
              checked={preferences.showThumbnails}
              onCheckedChange={handleToggleThumbnails}
            />
          </div>

          {/* Unread Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="space-y-0.5">
                <Label htmlFor="unread-filter">{t("settings.display.unreadFilter.label")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.display.unreadFilter.description")}
                </p>
              </div>
            </div>
            <Switch
              id="unread-filter"
              checked={preferences.showOnlyUnread}
              onCheckedChange={handleToggleUnreadFilter}
            />
          </div>

          {/* Default Sort Order */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="default-sort-order">{t("settings.reader.sortOrder.label")}</Label>
            </div>
            <Select
              value={preferences.defaultSortOrder}
              onValueChange={(value) => handleSortOrderChange(value as SortOrder)}
            >
              <SelectTrigger id="default-sort-order" className="w-full max-w-xs">
                <SelectValue placeholder={t("settings.reader.sortOrder.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {SORT_ORDERS.map((order) => (
                  <SelectItem key={order.value} value={order.value}>
                    {t(order.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("settings.reader.sortOrder.description")}
            </p>
          </div>

          {/* Show Missing Books */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="show-missing-books">{t("settings.reader.showMissing.label")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.reader.showMissing.description")}
                </p>
              </div>
            </div>
            <Switch
              id="show-missing-books"
              checked={preferences.showMissingBooks}
              onCheckedChange={handleShowMissingBooksChange}
            />
          </div>

          {/* Hide Missing Books */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="hide-missing-books">{t("settings.reader.hideMissing.label")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.reader.hideMissing.description")}
                </p>
              </div>
            </div>
            <Switch
              id="hide-missing-books"
              checked={preferences.hideMissingBooks}
              onCheckedChange={handleHideMissingBooksChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}