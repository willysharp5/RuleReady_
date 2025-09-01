"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function AdminPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);
  
  const importCSVData = useMutation(api.csvImport.importCSVData);
  const createWebsitesFromRules = useMutation(api.websites.createWebsitesFromComplianceRules);
  const importStats = useQuery(api.complianceImport.getImportStats);

  const handleImportCSV = async () => {
    try {
      setImporting(true);
      setImportResult(null);
      
      // Read the CSV file content
      const response = await fetch('/data/compliance_rules_enriched.csv');
      if (!response.ok) {
        throw new Error('Failed to fetch CSV file');
      }
      
      const csvContent = await response.text();
      
      console.log("📤 Starting CSV import...");
      const result = await importCSVData({ csvContent });
      
      setImportResult(result);
      console.log("✅ Import completed:", result);
      
    } catch (error) {
      console.error("❌ Import failed:", error);
      setImportResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCreateWebsites = async () => {
    try {
      setConverting(true);
      setConversionResult(null);
      
      console.log("🔄 Converting compliance rules to websites...");
      const result = await createWebsitesFromRules();
      
      setConversionResult(result);
      console.log("✅ Conversion completed:", result);
      
    } catch (error) {
      console.error("❌ Conversion failed:", error);
      setConversionResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">🏛️ Compliance Crawler Admin</h1>
        <p className="text-gray-600 mt-2">
          Manage compliance data import and monitoring system
        </p>
      </div>

      {/* Import Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Current Database Status</CardTitle>
          <CardDescription>Overview of imported compliance data</CardDescription>
        </CardHeader>
        <CardContent>
          {importStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importStats.rules}</div>
                <div className="text-sm text-gray-600">Compliance Rules</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importStats.reports}</div>
                <div className="text-sm text-gray-600">Compliance Reports</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{importStats.embeddings}</div>
                <div className="text-sm text-gray-600">Embeddings</div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              Loading statistics...
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle>📥 Import Compliance Rules</CardTitle>
          <CardDescription>
            Import 1,305 compliance rules from CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold">Ready to Import:</h3>
              <p className="text-sm text-gray-600">
                • 1,305 compliance rules<br/>
                • 52 jurisdictions (Federal + 50 states + DC)<br/>
                • 25 topic categories
              </p>
            </div>
            <Button 
              onClick={handleImportCSV} 
              disabled={importing}
              className="ml-4"
            >
              {importing ? "Importing..." : "Import CSV Data"}
            </Button>
          </div>

          {importing && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm">
                🔄 Importing compliance rules... This may take a few minutes.
              </p>
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {importResult.success ? (
                <div>
                  <h3 className="font-semibold text-green-800">✅ Import Successful!</h3>
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <p>• Imported: <Badge variant="outline">{importResult.imported}</Badge> rules</p>
                    <p>• Failed: <Badge variant="outline">{importResult.failed}</Badge> rules</p>
                    <p>• Total: <Badge variant="outline">{importResult.total}</Badge> rules processed</p>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        View errors ({importResult.errors.length})
                      </summary>
                      <div className="mt-2 text-xs bg-white p-3 rounded border max-h-32 overflow-y-auto">
                        {importResult.errors.map((error: string, i: number) => (
                          <div key={i} className="text-red-600 mb-1">{error}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-red-800">❌ Import Failed</h3>
                  <p className="text-sm text-red-700 mt-2">{importResult.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert to Websites */}
      {importStats && importStats.rules > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🌐 Integrate with Website Monitoring</CardTitle>
            <CardDescription>
              Convert {importStats.rules} compliance rules to monitored websites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <h3 className="font-semibold">Ready to Integrate:</h3>
                <p className="text-sm text-gray-600">
                  • {importStats.rules} compliance rules<br/>
                  • Will appear in main website monitoring interface<br/>
                  • Priority-based monitoring (daily for critical, weekly for low)
                </p>
              </div>
              <Button 
                onClick={handleCreateWebsites} 
                disabled={converting}
                className="ml-4"
              >
                {converting ? "Converting..." : "Create Websites"}
              </Button>
            </div>

            {converting && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm">
                  🔄 Converting compliance rules to websites... This may take a few minutes.
                </p>
              </div>
            )}

            {conversionResult && (
              <div className={`p-4 rounded-lg ${conversionResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                {conversionResult.success ? (
                  <div>
                    <h3 className="font-semibold text-green-800">✅ Conversion Successful!</h3>
                    <div className="text-sm text-green-700 mt-2 space-y-1">
                      <p>• Created: <Badge variant="outline">{conversionResult.created}</Badge> new websites</p>
                      <p>• Skipped: <Badge variant="outline">{conversionResult.skipped}</Badge> existing websites</p>
                      <p>• Total: <Badge variant="outline">{conversionResult.total}</Badge> rules processed</p>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded border">
                      <p className="text-sm font-medium text-blue-800">🎉 Compliance rules are now integrated!</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Visit the main page to see all compliance websites in your monitoring dashboard.
                        They will be monitored automatically based on priority.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-red-800">❌ Conversion Failed</h3>
                    <p className="text-sm text-red-700 mt-2">{conversionResult.error}</p>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>What this integration does:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Creates website entries for each compliance rule</li>
                <li>Adds priority indicators (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)</li>
                <li>Sets monitoring intervals based on priority</li>
                <li>Enables existing change detection for compliance</li>
                <li>Shows compliance alongside regular websites</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Next Steps</CardTitle>
          <CardDescription>What to do after importing the data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Badge variant={importStats?.rules ? "default" : "secondary"}>
                {importStats?.rules ? "✅" : "⏳"}
              </Badge>
              <span className="text-sm">Import compliance rules from CSV</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">⏳</Badge>
              <span className="text-sm">Import compliance reports (1,175 files)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">⏳</Badge>
              <span className="text-sm">Import existing Gemini embeddings (2,759)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">⏳</Badge>
              <span className="text-sm">Set up automated crawling for compliance monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">⏳</Badge>
              <span className="text-sm">Create compliance dashboard and filtering</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>ℹ️ System Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p><strong>Schema Status:</strong> Updated with compliance tables</p>
          <p><strong>Import Functions:</strong> Ready for CSV and report import</p>
          <p><strong>Embedding System:</strong> Job management system configured</p>
          <p><strong>Cron Jobs:</strong> Automated processing scheduled</p>
          <p><strong>Next Phase:</strong> Data import and RAG integration</p>
        </CardContent>
      </Card>
    </div>
  );
}
