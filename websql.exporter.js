(function(window) {
	
	var FORMAT = {
			JSON: 'json',
			/**
			 * Not Implemented yet
			 */
			CSV: 'csv',
			/**
			 * Not Implemented yet
			 */
			SQL: 'sql'
	};

	/**
	 * @param {Database} db
	 * @param {array} opts
	 * @returns {undefined}
	 */
	function Exporter(db, opts) {

		this.defaultOpts = {
			format: FORMAT.JSON,
			schema: true
		};
		
		var status = {
			schema: false,
			table: false
		};

		opts = opts || this.defaultOpts;

		function formatExportedData(data, format) {
			if (format === FORMAT.JSON) {
				return data;
			}
			
			switch (format) {
				default:
					return data;
			}
		}

		/**
		 * Get SQL statements to CREATE all tables in the database and submit them as an array to the callback function 
		 * @param {function} callback 
		 * @returns {undefined} 
		 */
		this.getSchema = function(callback) {
			db.transaction(function(tx) {

				tx.executeSql("SELECT sql FROM sqlite_master", [], function(tx, results) {
					var resultCount = results.rows.length,
						i = 0,
						resultArray = [];

					var currentDDL;
					for (; i < resultCount; i++) {
						currentDDL = results.rows.item(i)['sql'];
						if (currentDDL === null)
							continue;

						resultArray.push(results.rows.item(i)['sql']);
					}

					status.schema = new Date();

					if (typeof callback === 'function')
						callback(resultArray);
				});
			});
		};

		/**
		 * Get names of all tables in the Database
		 * @param {function} callback The function to be pass as an array of table names to
		 * @returns {undefined}
		 */
		this.getTables = function(callback, format) {
			db.transaction(function(tx) {
				tx.executeSql("SELECT tbl_name from sqlite_master WHERE type = 'table'", [], function(tx, results) {
					var resultCount = results.rows.length,
						i = 0,
						resultTables = [];

					for (; i < resultCount; i++) {
						if (results.rows.item(i)['tbl_name'] !== '__WebKitDatabaseInfoTable__')
							resultTables.push(results.rows.item(i)['tbl_name']);
					}

					status.tableNames = new Date();

					if (typeof callback === 'function')
						return callback(resultTables);
				});
			});
		};

		/**
		 * 
		 * @param {type} tableName
		 * @param {type} callback
		 * @param {string} format [optional] Overrides the format specified in Exporter Options
		 * @returns {undefined}
		 */
		this.exportTable = function(tableName, callback, format) {
			format = format || opts.format;
			db.transaction(function(tx) {
				tx.executeSql("SELECT * from " + tableName + ";", [], function(tx, results) {
					var resultCount = results.rows.length,
						i = 0,
						resultData = {columns: [], data: []},
					colName;
					if (results.rows.length > 0) {
						for (colName in results.rows.item(0)) {
							resultData.columns.push(colName);
						}

						for (var i = 0; i < resultCount; i++) {
							var row = results.rows.item(i);
							var resultRow = [];
							for (colName in row) {
								resultRow.push(row[colName]);
							}
							resultData.data.push(resultRow);
						}
					}

					if (status.table === false)
						status.table = [];

					status.table[tableName] = new Date();

					return callback( formatExportedData(resultData, format), tableName);
				});
			});
		};

		/**
		 * 
		 * @param {type} callback
		 * @param {string} format [optional] Overrides the format specified in Exporter Options
		 * @returns {undefined}
		 */
		this.exportAllTables = function(callback, format) {
			format = format || opts.format;
			status.table = false;
			var self = this;
			this.getTables(function(tableNames) {
				var returnData = {};
				var idx;
				for (idx in tableNames) {
					self.exportTable(tableNames[idx], function(tableData, tableName) {
						returnData[tableName] = tableData;
						if (typeof callback === 'function' && Object.keys(returnData).length === tableNames.length) {
							callback( formatExportedData(returnData, format) );
						}
					});
				}
			}, 'row_array');
		};
	}

	window.WebSqlExporter = Exporter;
	window.WebSqlExporter.FORMAT = FORMAT;
	
})(window);