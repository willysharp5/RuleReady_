"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function ComplianceImport() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  const importCSVData = useMutation(api.csvImport.importCSVData);

  const handleImport = async () => {
    try {
      setImporting(true);
      setImportResult(null);
      
      // Read the CSV file content (in a real app, this would be uploaded)
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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🏛️ Compliance Data Import</CardTitle>
        <CardDescription>
          Import 1,305 compliance rules from CSV file into the database
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
            onClick={handleImport} 
            disabled={importing}
            className="ml-4"
          >
            {importing ? "Importing..." : "Start Import"}
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
                <div className="text-sm text-green-700 mt-2">
                  <p>• Imported: {importResult.imported} rules</p>
                  <p>• Failed: {importResult.failed} rules</p>
                  <p>• Total: {importResult.total} rules processed</p>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">
                      View errors ({importResult.errors.length})
                    </summary>
                    <div className="mt-2 text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      {importResult.errors.map((error: string, i: number) => (
                        <div key={i} className="text-red-600">{error}</div>
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

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>What this import does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Creates compliance rules with jurisdiction and topic classification</li>
            <li>Sets up monitoring priorities (critical/high/medium/low)</li>
            <li>Configures crawl settings based on rule importance</li>
            <li>Creates jurisdiction and topic reference tables</li>
            <li>Prepares rules for FireCrawl monitoring</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
